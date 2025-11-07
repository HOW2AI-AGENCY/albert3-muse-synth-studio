/**
 * Mureka Provider Adapter
 * Transforms universal provider interface to Mureka-specific API calls
 */

import { supabase } from '@/integrations/supabase/client';
import { IProviderClient } from '../base';
import {
  GenerationParams,
  ExtensionParams,
  StemSeparationParams,
  GenerationResult,
  TaskStatus,
  BalanceInfo,
} from '../types';
import { logger } from '@/utils/logger';
import { handleGenerationError } from '@/utils/error-handlers/generation-errors';
import { metricsCollector } from '@/utils/monitoring/metrics';
import { withEdgeFunctionTimeout, TimeoutError } from '@/utils/timeout';

export class MurekaProviderAdapter implements IProviderClient {
  async generateMusic(params: GenerationParams): Promise<GenerationResult> {
    const startTime = Date.now();
    
    logger.info('Mureka adapter: generating music', undefined, {
      hasLyrics: !!params.lyrics,
      isBGM: params.makeInstrumental,
    });

    const payload = this.transformToMurekaFormat(params);

    try {
      // SEC-003: Add timeout to prevent indefinite hanging
      const { data, error } = await withEdgeFunctionTimeout(
        supabase.functions.invoke('generate-mureka', {
          body: payload,
        }),
        'generate-mureka'
      );

      if (error) {
        // Track failure metric
        metricsCollector.trackGeneration({
          trackId: params.trackId || 'unknown',
          provider: 'mureka',
          status: 'failed',
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        });

        logger.error('Mureka generation failed', error instanceof Error ? error : new Error(String(error)));
        handleGenerationError(error);
        throw error;
      }

      // Track success metric
      metricsCollector.trackGeneration({
        trackId: data.trackId || params.trackId || 'unknown',
        provider: 'mureka',
        status: 'completed',
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      });

      return this.transformFromMurekaFormat(data);
    } catch (error) {
      // Handle rate limit errors
      if (error && typeof error === 'object' && 'errorCode' in error) {
        const err = error as any;
        if (err.errorCode === 'RATE_LIMIT_EXCEEDED') {
          metricsCollector.trackRateLimit({
            provider: 'mureka',
            endpoint: 'generate-mureka',
            retryAfter: err.retryAfter,
            timestamp: Date.now(),
          });
        }
      }
      throw error;
    }
  }

  async extendTrack(params: ExtensionParams): Promise<GenerationResult> {
    logger.info('Mureka adapter: extending track', undefined, {
      trackId: params.originalTrackId,
    });

    // SEC-003: Add timeout
    const { data, error } = await withEdgeFunctionTimeout(
      supabase.functions.invoke('extend-lyrics-mureka', {
        body: {
          trackId: params.originalTrackId,
          prompt: params.prompt,
          duration: params.duration,
        },
      }),
      'extend-lyrics-mureka'
    );

    if (error) {
      logger.error('Mureka extend failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    return {
      taskId: data.taskId || data.id,
      trackId: data.trackId,
      status: 'processing',
      message: data.message,
    };
  }

  async separateStems(params: StemSeparationParams): Promise<GenerationResult> {
    logger.info('Mureka adapter: separating stems', undefined, {
      trackId: params.trackId,
      type: params.separationType,
    });

    // Mureka uses same Suno API for stem separation
    // SEC-003: Add timeout (stem separation can take longer)
    const { data, error } = await withEdgeFunctionTimeout(
      supabase.functions.invoke('separate-stems', {
        body: {
          taskId: params.trackId,
          audioId: params.audioId,
          type: params.separationType,
        },
      }),
      'separate-stems',
      60000 // 60 seconds for heavy processing
    );

    if (error) {
      logger.error('Mureka stem separation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    return {
      taskId: data.taskId || params.trackId,
      status: 'processing',
      message: data.message,
    };
  }

  async queryTask(taskId: string): Promise<TaskStatus> {
    const { data, error } = await supabase
      .from('tracks')
      .select('status, audio_url, cover_url, video_url, error_message')
      .eq('id', taskId)
      .single();

    if (error) {
      logger.error('Mureka task query failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    return {
      status: data.status as TaskStatus['status'],
      audioUrl: data.audio_url || undefined,
      coverUrl: data.cover_url || undefined,
      videoUrl: data.video_url || undefined,
      errorMessage: data.error_message || undefined,
    };
  }

  async getBalance(): Promise<BalanceInfo> {
    // SEC-003: Add timeout (balance queries should be fast)
    const { data, error } = await withEdgeFunctionTimeout(
      supabase.functions.invoke('get-mureka-balance'),
      'get-mureka-balance',
      10000 // 10 seconds - quick query
    );

    if (error) {
      logger.error('Mureka balance fetch failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    return {
      balance: data.balance,
      currency: data.currency || 'credits',
      details: data.details,
    };
  }

  private transformToMurekaFormat(params: GenerationParams): any {
    const sanitizedStyleTags = Array.isArray(params.styleTags)
      ? params.styleTags.map((tag) => tag?.trim()).filter((tag): tag is string => Boolean(tag))
      : [];
    const resolvedHasVocals =
      typeof params.hasVocals === 'boolean' ? params.hasVocals : undefined;
    const makeInstrumental =
      typeof params.makeInstrumental === 'boolean'
        ? params.makeInstrumental
        : resolvedHasVocals === false || params.isBGM === true;
    const hasVocals = resolvedHasVocals !== undefined ? resolvedHasVocals : !makeInstrumental;
    const isBGM =
      typeof params.isBGM === 'boolean' ? params.isBGM : makeInstrumental ? true : undefined;

    return {
      trackId: params.trackId,
      title: params.title,
      prompt: params.prompt,
      lyrics: params.lyrics,
      styleTags: sanitizedStyleTags.length > 0 ? sanitizedStyleTags : undefined,
      hasVocals,
      isBGM,
      modelVersion: params.modelVersion,
      idempotencyKey: params.idempotencyKey,
    };
  }

  private transformFromMurekaFormat(data: any): GenerationResult {
    return {
      taskId: data.taskId || data.id,
      trackId: data.trackId,
      status: data.success ? 'processing' : 'failed',
      message: data.message,
    };
  }
}
