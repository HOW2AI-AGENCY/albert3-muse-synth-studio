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

export class SunoProviderAdapter implements IProviderClient {
  async generateMusic(params: GenerationParams): Promise<GenerationResult> {
    logger.info('Suno adapter: generating music', undefined, {
      hasLyrics: !!params.lyrics,
      hasReference: !!params.referenceAudio,
    });

    const payload = this.transformToSunoFormat(params);

    const { data, error } = await supabase.functions.invoke('generate-suno', {
      body: payload,
    });

    if (error) {
      logger.error('Suno generation failed', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }

    return this.transformFromSunoFormat(data);
  }

  async extendTrack(params: ExtensionParams): Promise<GenerationResult> {
    logger.info('Suno adapter: extending track', undefined, {
      trackId: params.originalTrackId,
    });

    const { data, error } = await supabase.functions.invoke('extend-track', {
      body: {
        trackId: params.originalTrackId,
        prompt: params.prompt,
        duration: params.duration,
        continueAt: params.continueAt,
      },
    });

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

    const { data, error } = await supabase.functions.invoke('separate-stems', {
      body: {
        taskId: params.trackId,
        audioId: params.audioId,
        type: params.separationType,
      },
    });

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
    const { data, error } = await supabase.functions.invoke('get-balance', {
      body: { provider: 'suno' },
    });

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
    return {
      prompt: params.prompt,
      lyrics: params.lyrics,
      tags: params.styleTags || (params.style ? [params.style] : []),
      make_instrumental: params.makeInstrumental || false,
      model_version: params.modelVersion || 'V5',
      reference_audio_url: params.referenceAudio,
      reference_track_id: params.referenceTrackId,
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
