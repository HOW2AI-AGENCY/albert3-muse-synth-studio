/**
 * Suno Provider Adapter
 * Transforms universal provider interface to Suno-specific API calls
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

export class SunoProviderAdapter implements IProviderClient {
  async generateMusic(params: GenerationParams): Promise<GenerationResult> {
    const startTime = Date.now();
    
    logger.info('Suno adapter: generating music', undefined, {
      hasLyrics: !!params.lyrics,
      hasReference: !!params.referenceAudio,
    });

    const payload = this.transformToSunoFormat(params);

    try {
      // SEC-003: Add timeout to prevent indefinite hanging
      const { data, error } = await withEdgeFunctionTimeout(
        supabase.functions.invoke('generate-suno', {
          body: payload,
        }),
        'generate-suno'
      );

      if (error) {
        // Track failure metric
        metricsCollector.trackGeneration({
          trackId: params.trackId || 'unknown',
          provider: 'suno',
          status: 'failed',
          duration: Date.now() - startTime,
          timestamp: Date.now(),
        });

        logger.error('Suno generation failed', error instanceof Error ? error : new Error(String(error)));
        handleGenerationError(error);
        throw error;
      }

      // Track success metric
      metricsCollector.trackGeneration({
        trackId: data.trackId || params.trackId || 'unknown',
        provider: 'suno',
        status: 'completed',
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      });

      return this.transformFromSunoFormat(data);
    } catch (error) {
      // Handle timeout errors
      if (error instanceof TimeoutError) {
        logger.error('Suno generation timeout', error);
        metricsCollector.trackGeneration({
          trackId: params.trackId || 'unknown',
          provider: 'suno',
          status: 'timeout',
          duration: error.timeoutMs,
          timestamp: Date.now(),
        });
      }

      // Handle rate limit errors
      if (error && typeof error === 'object' && 'errorCode' in error) {
        const err = error as any;
        if (err.errorCode === 'RATE_LIMIT_EXCEEDED') {
          metricsCollector.trackRateLimit({
            provider: 'suno',
            endpoint: 'generate-suno',
            retryAfter: err.retryAfter,
            timestamp: Date.now(),
          });
        }
      }
      throw error;
    }
  }

  async extendTrack(params: ExtensionParams): Promise<GenerationResult> {
    logger.info('Suno adapter: extending track', undefined, {
      trackId: params.originalTrackId,
    });

    // SEC-003: Add timeout
    const { data, error } = await withEdgeFunctionTimeout(
      supabase.functions.invoke('extend-track', {
        body: {
          trackId: params.originalTrackId,
          prompt: params.prompt,
          duration: params.duration,
          continueAt: params.continueAt,
        },
      }),
      'extend-track'
    );

    if (error) {
      logger.error('Suno extend failed', error instanceof Error ? error : new Error(String(error)));
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
    logger.info('Suno adapter: separating stems', undefined, {
      trackId: params.trackId,
      type: params.separationType,
    });

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
      logger.error('Suno stem separation failed', error instanceof Error ? error : new Error(String(error)));
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
      logger.error('Suno task query failed', error instanceof Error ? error : new Error(String(error)));
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
    // SEC-003: Add timeout
    const { data, error } = await withEdgeFunctionTimeout(
      supabase.functions.invoke('get-balance', {
        body: { provider: 'suno' },
      }),
      'get-balance',
      10000 // 10 seconds for quick query
    );

    if (error) {
      logger.error('Suno balance fetch failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    return {
      balance: data.balance,
      currency: data.currency,
      details: data.details,
    };
  }

  private transformToSunoFormat(params: GenerationParams): any {
    const clampRatio = (value?: number) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return undefined;
      }
      return Math.min(Math.max(value, 0), 1);
    };

    const sanitizedTags = Array.isArray(params.styleTags)
      ? params.styleTags.map((tag) => tag?.trim()).filter((tag): tag is string => Boolean(tag))
      : params.style
        ? [params.style]
        : [];
    const negativeTags = params.negativeTags?.trim();
    const resolvedHasVocals =
      typeof params.hasVocals === 'boolean' ? params.hasVocals : undefined;
    const makeInstrumental =
      typeof params.makeInstrumental === 'boolean'
        ? params.makeInstrumental
        : resolvedHasVocals === false;
    const vocalGender = params.vocalGender === 'm' || params.vocalGender === 'f' ? params.vocalGender : undefined;

    return {
      trackId: params.trackId,
      prompt: params.prompt,
      lyrics: params.lyrics,
      tags: sanitizedTags,
      make_instrumental: makeInstrumental,
      model_version: params.modelVersion || 'V5',
      hasVocals: resolvedHasVocals,
      customMode: params.customMode,
      negativeTags: negativeTags && negativeTags.length > 0 ? negativeTags : undefined,
      vocalGender,
      styleWeight: clampRatio(params.styleWeight),
      lyricsWeight: clampRatio(params.lyricsWeight),
      weirdnessConstraint: clampRatio(params.weirdness),
      audioWeight: clampRatio(params.audioWeight),
      referenceAudioUrl: params.referenceAudio,
      referenceTrackId: params.referenceTrackId,
      idempotencyKey: params.idempotencyKey,
    };
  }

  private transformFromSunoFormat(data: any): GenerationResult {
    return {
      taskId: data.taskId || data.id,
      trackId: data.trackId,
      status: data.success ? 'processing' : 'failed',
      message: data.message,
      tracks: data.tracks,
    };
  }
}
