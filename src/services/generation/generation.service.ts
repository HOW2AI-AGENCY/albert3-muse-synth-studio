/**
 * Unified Generation Service
 * Централизованный сервис для генерации музыки через Suno/Mureka
 */

import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import type { MusicProvider } from '@/config/provider-models';

export interface GenerationRequest {
  // Core params
  prompt: string;
  title?: string;
  lyrics?: string;
  tags?: string[];
  
  // Provider specific
  provider?: MusicProvider;
  modelVersion?: string;
  
  // Advanced options
  hasVocals?: boolean;
  customMode?: boolean;
  vocalGender?: 'm' | 'f' | 'any';
  
  // Weights & controls
  audioWeight?: number;
  styleWeight?: number;
  lyricsWeight?: number;
  weirdness?: number;
  
  // Reference audio
  referenceAudioUrl?: string | null;
  referenceTrackId?: string | null;
  
  // Other
  negativeTags?: string;
  idempotencyKey?: string;
  trackId?: string;
}

export interface GenerationResult {
  success: boolean;
  trackId: string;
  taskId?: string;
  message?: string;
}

export class GenerationService {
  /**
   * Main generation method
   */
  static async generate(request: GenerationRequest): Promise<GenerationResult> {
    const provider = request.provider || 'suno';
    
    logger.info('🎵 [GenerationService] Starting generation', 'GenerationService', {
      provider,
      hasPrompt: !!request.prompt,
      hasLyrics: !!request.lyrics,
      hasReference: !!request.referenceAudioUrl,
    });

    // Choose provider-specific handler
    if (provider === 'suno') {
      return await this.generateSuno(request);
    } else if (provider === 'mureka') {
      return await this.generateMureka(request);
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }

  /**
   * Suno generation
   */
  private static async generateSuno(request: GenerationRequest): Promise<GenerationResult> {
    const {
      prompt,
      title,
      lyrics,
      tags = [],
      modelVersion = 'V5',
      hasVocals,
      customMode,
      vocalGender,
      audioWeight,
      styleWeight,
      weirdness,
      referenceAudioUrl,
      referenceTrackId,
      negativeTags,
      idempotencyKey,
      trackId,
    } = request;

    // Map parameters to Suno API format
    const payload = {
      trackId,
      prompt,
      title,
      lyrics: lyrics || undefined,
      tags: tags.length > 0 ? tags : undefined,
      model_version: modelVersion,
      hasVocals: hasVocals !== undefined ? hasVocals : undefined,
      customMode: customMode !== undefined ? customMode : undefined,
      vocalGender: vocalGender && vocalGender !== 'any' ? vocalGender : undefined,
      audioWeight: audioWeight !== undefined ? audioWeight / 100 : undefined,
      styleWeight: styleWeight !== undefined ? styleWeight / 100 : undefined,
      weirdnessConstraint: weirdness !== undefined ? weirdness / 100 : undefined,
      referenceAudioUrl: referenceAudioUrl || undefined,
      referenceTrackId: referenceTrackId || undefined,
      negativeTags: negativeTags || undefined,
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
      make_instrumental: hasVocals === false,
      wait_audio: false,
    };

    logger.info('📤 [GenerationService] Calling Suno edge function', 'GenerationService', {
      hasLyrics: !!payload.lyrics,
      hasReference: !!payload.referenceAudioUrl,
      customMode: payload.customMode,
    });

    const { data, error } = await supabase.functions.invoke('generate-suno', {
      body: payload,
    });

    if (error) {
      logger.error('[GenerationService] Suno generation failed', error as Error, 'GenerationService');
      throw error;
    }

    if (!data?.trackId) {
      throw new Error('No trackId returned from Suno generation');
    }

    logger.info('✅ [GenerationService] Suno generation started', 'GenerationService', {
      trackId: data.trackId,
      taskId: data.taskId,
    });

    return {
      success: true,
      trackId: data.trackId,
      taskId: data.taskId,
      message: data.message,
    };
  }

  /**
   * Mureka generation
   */
  private static async generateMureka(request: GenerationRequest): Promise<GenerationResult> {
    const {
      prompt,
      title,
      lyrics,
      tags = [],
      modelVersion = 'auto',
      hasVocals,
      vocalGender,
      idempotencyKey,
      trackId,
    } = request;

    const payload = {
      trackId,
      prompt,
      title,
      lyrics: lyrics || undefined,
      tags: tags.length > 0 ? tags : undefined,
      model: modelVersion,
      hasVocals: hasVocals !== undefined ? hasVocals : undefined,
      vocalGender: vocalGender && vocalGender !== 'any' ? vocalGender : undefined,
      idempotencyKey: idempotencyKey || crypto.randomUUID(),
    };

    logger.info('📤 [GenerationService] Calling Mureka edge function', 'GenerationService');

    const { data, error } = await supabase.functions.invoke('generate-mureka', {
      body: payload,
    });

    if (error) {
      logger.error('[GenerationService] Mureka generation failed', error as Error, 'GenerationService');
      throw error;
    }

    if (!data?.trackId) {
      throw new Error('No trackId returned from Mureka generation');
    }

    logger.info('✅ [GenerationService] Mureka generation started', 'GenerationService', {
      trackId: data.trackId,
    });

    return {
      success: true,
      trackId: data.trackId,
      message: data.message,
    };
  }

  /**
   * Subscribe to track status updates
   */
  static subscribe(
    trackId: string,
    callback: (status: 'completed' | 'failed' | 'processing', trackData?: any) => void
  ): RealtimeChannel {
    logger.info('👂 [GenerationService] Subscribing to track updates', 'GenerationService', { trackId });

    const channel = supabase
      .channel(`track_updates_${trackId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${trackId}`,
        },
        (payload) => {
          const track = payload.new as any;
          
          logger.info('🔄 [GenerationService] Track update received', 'GenerationService', {
            trackId: track.id,
            status: track.status,
          });

          if (track.status === 'completed') {
            callback('completed', track);
          } else if (track.status === 'failed') {
            callback('failed', track);
          } else if (track.status === 'processing') {
            callback('processing', track);
          }
        }
      )
      .subscribe();

    return channel;
  }
}
