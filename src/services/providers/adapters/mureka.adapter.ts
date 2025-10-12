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

export class MurekaProviderAdapter implements IProviderClient {
  async generateMusic(params: GenerationParams): Promise<GenerationResult> {
    logger.info('Mureka adapter: generating music', undefined, {
      hasLyrics: !!params.lyrics,
      isBGM: params.makeInstrumental,
    });

    const payload = this.transformToMurekaFormat(params);

    const { data, error } = await supabase.functions.invoke('generate-mureka', {
      body: payload,
    });

    if (error) {
      logger.error('Mureka generation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    return this.transformFromMurekaFormat(data);
  }

  async extendTrack(params: ExtensionParams): Promise<GenerationResult> {
    logger.info('Mureka adapter: extending track', undefined, {
      trackId: params.originalTrackId,
    });

    const { data, error } = await supabase.functions.invoke('extend-lyrics-mureka', {
      body: {
        trackId: params.originalTrackId,
        prompt: params.prompt,
        duration: params.duration,
      },
    });

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
    const { data, error } = await supabase.functions.invoke('separate-stems', {
      body: {
        taskId: params.trackId,
        audioId: params.audioId,
        type: params.separationType,
      },
    });

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
    const { data, error } = await supabase.functions.invoke('get-mureka-balance');

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
    return {
      prompt: params.prompt,
      lyrics: params.lyrics,
      styleTags: params.styleTags,
      hasVocals: !params.makeInstrumental,
      isBGM: params.makeInstrumental || false,
      modelVersion: params.modelVersion,
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
