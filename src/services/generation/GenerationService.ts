/**
 * Generation Service - Unified API for music generation
 * Handles both Suno and Mureka providers with idempotency and real-time updates
 */

import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { MusicProvider } from '@/config/provider-models';
import type { SunoRequestDTO } from '@/types/generation';

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
  private static pendingRequests = new Map<string, Promise<GenerationResult>>();
  
  /**
   * Deduplicate identical requests within 5 seconds
   */
  private static getRequestKey(request: GenerationRequest): string {
    return `${request.provider}:${request.prompt}:${request.modelVersion}:${request.idempotencyKey || ''}`;
  }
  /**
   * Generate music using specified provider
   */
  static generate(request: GenerationRequest): Promise<GenerationResult> {
    const startTime = Date.now();
    const functionName = request.provider === 'suno' ? 'generate-suno' : 'generate-mureka';
    const requestKey = this.getRequestKey(request);

    // Check for duplicate in-flight requests
    const pendingRequest = this.pendingRequests.get(requestKey);
    if (pendingRequest) {
      logger.info(`🔄 [GenerationService] Deduplicating request`, 'GenerationService', {
        provider: request.provider,
        requestKey,
      });
      return pendingRequest;
    }

    logger.info(`🎸 [GenerationService] Invoking ${functionName}`, 'GenerationService', {
      provider: request.provider,
      promptLength: request.prompt.length,
      hasLyrics: !!request.lyrics,
      modelVersion: request.modelVersion,
    });

    // Create promise and store it for deduplication
    const generationPromise = (async () => {
      try {
        // Map to a lean DTO to avoid over-posting data
        const payload: SunoRequestDTO = {
          trackId: request.trackId,
          prompt: request.prompt,
          tags: request.tags,
          title: request.title,
          make_instrumental: request.make_instrumental,
          model_version: request.modelVersion,
          lyrics: request.lyrics,
          hasVocals: request.hasVocals,
          customMode: request.customMode,
          negativeTags: request.negativeTags,
          vocalGender: request.vocalGender as 'm' | 'f' | undefined,
          styleWeight: request.styleWeight,
          weirdnessConstraint: request.weirdnessConstraint,
          audioWeight: request.audioWeight,
          referenceAudioUrl: request.referenceAudioUrl,
          idempotencyKey: request.idempotencyKey,
          wait_audio: false, // Always false from client
          projectId: request.projectId,
        };

        const { data, error } = await supabase.functions.invoke(functionName, {
          body: payload,
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
      } finally {
        // Remove from pending requests after 5 seconds
        setTimeout(() => {
          this.pendingRequests.delete(requestKey);
        }, 5000);
      }
    })();

    this.pendingRequests.set(requestKey, generationPromise);
    return generationPromise;
  }

  /**
   * Subscribe to real-time track status updates
   *
   * @deprecated Use RealtimeSubscriptionManager.subscribeToTrack() instead
   * This method creates duplicate subscriptions and will be removed in future version
   *
   * Migration example:
   * ```typescript
   * // ❌ OLD
   * const subscription = GenerationService.subscribe(trackId, callback);
   *
   * // ✅ NEW
   * import RealtimeSubscriptionManager from '@/services/realtimeSubscriptionManager';
   * const unsubscribe = RealtimeSubscriptionManager.subscribeToTrack(trackId, (payload) => {
   *   const track = payload.new;
   *   if (track.status === 'completed') callback('completed', track);
   * });
   * ```
   */
  static subscribe(trackId: string, callback: TrackStatusCallback): RealtimeChannel {
    // Cleanup existing subscription for this track
    const existing = this.activeSubscriptions.get(trackId);
    if (existing) {
      existing.unsubscribe();
      this.activeSubscriptions.delete(trackId);
    }

    logger.warn('⚠️ [GenerationService] Using deprecated subscribe method - migrate to RealtimeSubscriptionManager', 'GenerationService', { trackId });

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
   * @deprecated Use RealtimeSubscriptionManager instead
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
   * @deprecated Use RealtimeSubscriptionManager instead
   */
  static unsubscribeAll(): void {
    this.activeSubscriptions.forEach((channel, trackId) => {
      channel.unsubscribe();
      logger.info('📡 [GenerationService] Unsubscribed from track', 'GenerationService', { trackId });
    });
    this.activeSubscriptions.clear();
  }
}
