/**
 * Generation Service - Unified API for music generation
 * Handles both Suno and Mureka providers with idempotency and real-time updates
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MusicProvider } from '@/config/provider-models';

export interface GenerationRequest {
  provider: MusicProvider;
  prompt: string;
  title?: string;
  lyrics?: string;
  styleTags?: string[];
  hasVocals?: boolean;
  isBGM?: boolean;
  modelVersion?: string;
  idempotencyKey?: string;
  trackId?: string;
  projectId?: string;
  // Suno-specific
  customMode?: boolean;
  make_instrumental?: boolean;
  tags?: string[];
  negativeTags?: string;
  vocalGender?: string;
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  lyricsWeight?: number;
  referenceAudioUrl?: string | null;
}

export interface GenerationResult {
  success: boolean;
  trackId: string;
  taskId?: string;
  message?: string;
  error?: string;
}

type TrackStatusCallback = (status: 'pending' | 'processing' | 'completed' | 'failed', trackData?: any) => void;

export class GenerationService {
  private static activeSubscriptions = new Map<string, RealtimeChannel>();

  /**
   * Generate music using specified provider
   */
  static async generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const functionName = request.provider === 'suno' ? 'generate-suno' : 'generate-mureka';

    logger.info(`🎸 [GenerationService] Invoking ${functionName}`, 'GenerationService', {
      provider: request.provider,
      promptLength: request.prompt.length,
      hasLyrics: !!request.lyrics,
      modelVersion: request.modelVersion,
    });

    try {
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: request,
      });

      if (error) {
        logger.error(`❌ [GenerationService] Edge function error`, error, 'GenerationService', {
          provider: request.provider,
          functionName,
          duration: Date.now() - startTime,
        });
        throw new Error(error.message || 'Edge function invocation failed');
      }

      if (!data || !data.success) {
        const errorMsg = data?.error || 'Unknown error from edge function';
        logger.error(`❌ [GenerationService] Generation failed`, new Error(errorMsg), 'GenerationService', {
          provider: request.provider,
          response: data,
          duration: Date.now() - startTime,
        });
        throw new Error(errorMsg);
      }

      logger.info(`✅ [GenerationService] Generation started`, 'GenerationService', {
        provider: request.provider,
        trackId: data.trackId,
        taskId: data.taskId,
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        trackId: data.trackId,
        taskId: data.taskId,
        message: data.message,
      };

    } catch (error) {
      logger.error(`🔴 [GenerationService] Generation error`, error as Error, 'GenerationService', {
        provider: request.provider,
        duration: Date.now() - startTime,
      });

      return {
        success: false,
        trackId: '',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Subscribe to real-time track status updates
   */
  static subscribe(trackId: string, callback: TrackStatusCallback): RealtimeChannel {
    // Cleanup existing subscription for this track
    const existing = this.activeSubscriptions.get(trackId);
    if (existing) {
      existing.unsubscribe();
      this.activeSubscriptions.delete(trackId);
    }

    logger.info('📡 [GenerationService] Setting up realtime subscription', 'GenerationService', { trackId });

    const channel = supabase
      .channel(`track-${trackId}`)
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
          
          logger.info('🔔 [GenerationService] Track update received', 'GenerationService', {
            trackId,
            status: track.status,
            hasAudioUrl: !!track.audio_url,
          });

          if (track.status === 'completed') {
            callback('completed', {
              title: track.title,
              audioUrl: track.audio_url,
              coverUrl: track.cover_url,
            });
          } else if (track.status === 'failed') {
            callback('failed', {
              errorMessage: track.error_message,
            });
          } else if (track.status === 'processing') {
            callback('processing', track);
          } else if (track.status === 'pending') {
            callback('pending', track);
          }
        }
      )
      .subscribe((status) => {
        logger.info(`📡 [GenerationService] Subscription status: ${status}`, 'GenerationService', { trackId });
      });

    this.activeSubscriptions.set(trackId, channel);
    return channel;
  }

  /**
   * Unsubscribe from track updates
   */
  static unsubscribe(trackId: string): void {
    const channel = this.activeSubscriptions.get(trackId);
    if (channel) {
      channel.unsubscribe();
      this.activeSubscriptions.delete(trackId);
      logger.info('📡 [GenerationService] Unsubscribed from track updates', 'GenerationService', { trackId });
    }
  }

  /**
   * Unsubscribe from all active subscriptions
   */
  static unsubscribeAll(): void {
    this.activeSubscriptions.forEach((channel, trackId) => {
      channel.unsubscribe();
      logger.info('📡 [GenerationService] Unsubscribed from track', 'GenerationService', { trackId });
    });
    this.activeSubscriptions.clear();
  }
}
