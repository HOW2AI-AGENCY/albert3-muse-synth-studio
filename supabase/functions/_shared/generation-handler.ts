/**
 * Base Generation Handler
 * 
 * Abstract class that provides common logic for music generation:
 * - Track creation and management
 * - Idempotency handling
 * - Polling mechanism
 * - Storage uploads
 * - Error handling and logging
 * 
 * Provider-specific implementations (Suno, Mureka) extend this class
 * and implement abstract methods for API calls and response parsing.
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { logger } from "./logger.ts";
import { findOrCreateTrack } from "./track-helpers.ts";
import { downloadAndUploadAudio, downloadAndUploadCover, downloadAndUploadVideo } from "./storage.ts";
import { autoSaveLyrics } from "./auto-save-lyrics.ts";
import type {
  BaseGenerationParams,
  GenerationResponse,
  ProviderTrackData,
  PollingConfig,
  TrackMetadata,
} from "./types/generation.ts";
import { DEFAULT_POLLING_CONFIG } from "./types/generation.ts";

export abstract class GenerationHandler<TParams extends BaseGenerationParams = BaseGenerationParams> {
  protected abstract providerName: 'suno' | 'mureka';
  protected supabase: SupabaseClient;
  protected userId: string;
  
  constructor(supabase: SupabaseClient, userId: string) {
    this.supabase = supabase;
    this.userId = userId;
  }

  // ============= Abstract Methods (Provider-Specific) =============

  /**
   * Call the provider's API to start music generation
   * @returns Task ID from the provider
   */
  protected abstract callProviderAPI(params: TParams, trackId: string): Promise<string>;

  /**
   * Poll the provider's API to check task status
   * @returns Current status and track data
   */
  protected abstract pollTaskStatus(taskId: string): Promise<ProviderTrackData>;

  /**
   * Validate provider-specific parameters before generation
   */
  protected abstract validateProviderParams(params: TParams): Promise<void>;

  /**
   * Build provider-specific metadata for the track
   */
  protected abstract buildMetadata(params: TParams): Record<string, unknown>;

  // ============= Public API =============

  /**
   * Main generation flow
   */
  async generate(params: TParams): Promise<GenerationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info(`🎵 [${this.providerName.toUpperCase()}] Generation request received`, {
        userId: this.userId,
        promptLength: params.prompt.length,
        hasLyrics: !!params.lyrics,
        provider: this.providerName,
      });

      // 1. Validate parameters
      await this.validateProviderParams(params);

      // 2. Check idempotency
      const idempotencyKey = params.idempotencyKey || crypto.randomUUID();
      const existingTrack = await this.checkIdempotency(idempotencyKey);
      
      if (existingTrack) {
        return {
          success: true,
          trackId: existingTrack.id,
          taskId: existingTrack.taskId,
          message: 'Request already processed (idempotency check)',
        };
      }

      // 3. Create track record
      const { trackId } = await this.createTrackRecord(params, idempotencyKey);
      
      logger.info(`✅ [${this.providerName.toUpperCase()}] Track created`, { trackId });

      // 4. Call provider API
      const taskId = await this.callProviderAPI(params, trackId);
      
      logger.info(`✅ [${this.providerName.toUpperCase()}] API call successful`, { 
        trackId, 
        taskId,
        duration: Date.now() - startTime,
      });

      // 5. Update track with task ID
      await this.updateTrackTaskId(trackId, taskId);

      // 6. Start background polling
      this.startPolling(trackId, taskId).catch(err => {
        logger.error(`🔴 [${this.providerName.toUpperCase()}] Polling error`, { 
          error: err,
          trackId,
          taskId,
        });
      });

      return {
        success: true,
        trackId,
        taskId,
        message: 'Generation started successfully',
      };

    } catch (error) {
      logger.error(`🔴 [${this.providerName.toUpperCase()}] Generation failed`, { 
        error,
        userId: this.userId,
        duration: Date.now() - startTime,
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ============= Protected Helper Methods =============

  /**
   * Check if this request was already processed (idempotency)
   */
  protected async checkIdempotency(idempotencyKey: string): Promise<{ id: string; taskId?: string } | null> {
    const { data: existingTrack } = await this.supabase
      .from('tracks')
      .select('id, status, metadata')
      .eq('idempotency_key', idempotencyKey)
      .eq('user_id', this.userId)
      .maybeSingle();

    if (existingTrack) {
      const taskId = (existingTrack.metadata as any)?.suno_task_id || 
                     (existingTrack.metadata as any)?.mureka_task_id;
      
      logger.info(`🔁 [${this.providerName.toUpperCase()}] Idempotent request detected`, {
        trackId: existingTrack.id,
        status: existingTrack.status,
        taskId,
      });
      
      return { id: existingTrack.id, taskId };
    }

    return null;
  }

  /**
   * Create or find track record in database
   */
  protected async createTrackRecord(params: TParams, idempotencyKey: string): Promise<{ trackId: string }> {
    const metadata = this.buildMetadata(params);

    const { trackId } = await findOrCreateTrack(this.supabase, this.userId, {
      trackId: params.trackId,
      title: params.title,
      prompt: params.prompt,
      lyrics: params.lyrics,
      hasVocals: params.hasVocals,
      styleTags: params.styleTags,
      provider: this.providerName,
      requestMetadata: metadata,
      idempotencyKey,
    });

    return { trackId };
  }

  /**
   * Update track with provider task ID
   */
  protected async updateTrackTaskId(trackId: string, taskId: string): Promise<void> {
    const taskIdField = this.providerName === 'suno' ? 'suno_task_id' : 'mureka_task_id';
    
    logger.info(`🔄 Updating track with ${taskIdField}`, { trackId, taskId, provider: this.providerName });
    
    // Fetch existing metadata
    const { data: existingTrack } = await this.supabase
      .from('tracks')
      .select('metadata')
      .eq('id', trackId)
      .single();

    const existingMetadata = (existingTrack?.metadata as Record<string, unknown>) || {};
    
    const updateData: any = {
      status: 'processing',
      metadata: {
        ...existingMetadata,
        [taskIdField]: taskId,
        started_at: new Date().toISOString(),
        polling_attempts: 0,
      },
    };

    // Only set suno_id for Suno provider (suno_id column exists)
    if (this.providerName === 'suno') {
      updateData.suno_id = taskId;
    }
    
    // For Mureka, set mureka_task_id column (mureka_task_id column exists)
    if (this.providerName === 'mureka') {
      updateData.mureka_task_id = taskId;
    }

    const { error } = await this.supabase
      .from('tracks')
      .update(updateData)
      .eq('id', trackId);

    if (error) {
      logger.error(`❌ Failed to update track with ${taskIdField}`, { error, trackId, taskId });
      throw new Error(`Failed to update track with task ID: ${error.message}`);
    }

    logger.info(`✅ Track updated with ${taskIdField}`, { trackId, taskId });
  }

  /**
   * Start polling the provider API for completion
   */
  protected async startPolling(
    trackId: string, 
    taskId: string,
    config: PollingConfig = DEFAULT_POLLING_CONFIG as PollingConfig
  ): Promise<void> {
    let attemptNumber = 0;

    const poll = async (): Promise<void> => {
      if (attemptNumber >= config.maxAttempts) {
        await this.handlePollingTimeout(trackId, taskId);
        return;
      }

      try {
        const trackData = await this.pollTaskStatus(taskId);
        
        // Update polling metadata
        await this.supabase
          .from('tracks')
          .update({
            metadata: {
              polling_attempts: attemptNumber + 1,
              last_poll_at: new Date().toISOString(),
            },
          })
          .eq('id', trackId);

        logger.info(`🔍 [${this.providerName.toUpperCase()}] Poll attempt ${attemptNumber + 1}/${config.maxAttempts}`, {
          trackId,
          taskId,
          status: trackData.status,
        });

        if (trackData.status === 'completed') {
          await this.handleCompletedTrack(trackId, trackData);
          return;
        }

        if (trackData.status === 'failed') {
          await this.handleFailedTrack(trackId, trackData.error || 'Generation failed');
          return;
        }

        // Continue polling
        attemptNumber++;
        setTimeout(poll, config.intervalMs);

      } catch (error) {
        logger.error(`🔴 [${this.providerName.toUpperCase()}] Polling error`, {
          error,
          trackId,
          taskId,
          attempt: attemptNumber + 1,
        });
        
        // Retry polling after error
        attemptNumber++;
        setTimeout(poll, config.intervalMs);
      }
    };

    // Start polling
    setTimeout(poll, config.intervalMs);
  }

  /**
   * Handle successfully completed track
   */
  protected async handleCompletedTrack(trackId: string, trackData: ProviderTrackData): Promise<void> {
    logger.info(`✅ [${this.providerName.toUpperCase()}] Track completed`, { 
      trackId,
      hasAudioUrl: !!trackData.audio_url,
      hasCoverUrl: !!trackData.cover_url,
      hasTitle: !!trackData.title,
      title: trackData.title,
    });

    // Upload media to storage
    let finalAudioUrl = trackData.audio_url;
    let finalCoverUrl = trackData.cover_url;
    let finalVideoUrl = trackData.video_url;

    try {
      if (trackData.audio_url) {
        logger.info(`📥 [${this.providerName.toUpperCase()}] Starting audio upload`, { 
          trackId,
          audioUrlPreview: trackData.audio_url.substring(0, 80)
        });
        
        finalAudioUrl = await downloadAndUploadAudio(
          trackData.audio_url,
          trackId,
          this.userId,
          'main.mp3',
          this.supabase
        );
        logger.info(`✅ [${this.providerName.toUpperCase()}] Audio uploaded to storage`, { 
          trackId,
          finalUrlPreview: finalAudioUrl?.substring(0, 80)
        });
      } else {
        logger.warn(`⚠️ [${this.providerName.toUpperCase()}] No audio_url in trackData`, { trackId });
      }

      if (trackData.cover_url) {
        logger.info(`🖼️ [${this.providerName.toUpperCase()}] Starting cover upload`, { 
          trackId,
          coverUrlPreview: trackData.cover_url.substring(0, 80)
        });
        
        finalCoverUrl = await downloadAndUploadCover(
          trackData.cover_url,
          trackId,
          this.userId,
          'cover.webp',
          this.supabase
        );
        logger.info(`✅ [${this.providerName.toUpperCase()}] Cover uploaded to storage`, { 
          trackId,
          finalUrlPreview: finalCoverUrl?.substring(0, 80)
        });
      } else {
        logger.warn(`⚠️ [${this.providerName.toUpperCase()}] No cover_url in trackData`, { trackId });
      }

      if (trackData.video_url) {
        finalVideoUrl = await downloadAndUploadVideo(
          trackData.video_url,
          trackId,
          this.userId,
          'video.mp4',
          this.supabase
        );
        logger.info(`🎬 [${this.providerName.toUpperCase()}] Video uploaded to storage`, { trackId });
      }
    } catch (uploadError) {
      logger.error(`⚠️ [${this.providerName.toUpperCase()}] Media upload failed, using external URLs`, {
        error: uploadError,
        errorMessage: uploadError instanceof Error ? uploadError.message : String(uploadError),
        trackId,
      });
    }

    // Prepare update object
    const updateData: any = {
      status: 'completed',
      audio_url: finalAudioUrl,
      cover_url: finalCoverUrl,
      video_url: finalVideoUrl,
      duration: trackData.duration,
      metadata: {
        completed_at: new Date().toISOString(),
      },
    };

    // Update title if provided by provider
    if (trackData.title) {
      updateData.title = trackData.title;
      logger.info(`📝 [${this.providerName.toUpperCase()}] Updating title from provider`, { 
        trackId, 
        title: trackData.title 
      });
    }

    logger.info(`💾 [${this.providerName.toUpperCase()}] Updating track in DB`, {
      trackId,
      hasAudioUrl: !!updateData.audio_url,
      hasCoverUrl: !!updateData.cover_url,
      hasTitle: !!updateData.title,
      audioUrlPreview: updateData.audio_url?.substring(0, 80),
      coverUrlPreview: updateData.cover_url?.substring(0, 80),
    });

    // Update track as completed
    const { data: updatedTrack, error: updateError } = await this.supabase
      .from('tracks')
      .update(updateData)
      .eq('id', trackId)
      .select('title, lyrics, prompt, style_tags')
      .single();

    if (updateError) {
      logger.error(`❌ [${this.providerName.toUpperCase()}] Failed to update track`, {
        trackId,
        error: updateError,
        errorMessage: updateError.message,
      });
      throw updateError;
    }

    logger.info(`✅ [${this.providerName.toUpperCase()}] Track updated in DB`, { trackId });

    // ✅ Auto-save lyrics if present
    if (updatedTrack?.lyrics) {
      await autoSaveLyrics(this.supabase, {
        trackId,
        userId: this.userId,
        title: updatedTrack.title || 'Untitled Track',
        lyrics: updatedTrack.lyrics,
        prompt: updatedTrack.prompt || undefined,
        tags: updatedTrack.style_tags || [],
      });
    }

    logger.info(`🎉 [${this.providerName.toUpperCase()}] Track finalized`, { trackId });
  }

  /**
   * Handle failed track
   */
  protected async handleFailedTrack(trackId: string, errorMessage: string): Promise<void> {
    logger.error(`❌ [${this.providerName.toUpperCase()}] Track failed`, {
      trackId,
      error: errorMessage,
    });

    await this.supabase
      .from('tracks')
      .update({
        status: 'failed',
        error_message: errorMessage,
        metadata: {
          failed_at: new Date().toISOString(),
        },
      })
      .eq('id', trackId);
  }

  /**
   * Handle polling timeout
   */
  protected async handlePollingTimeout(trackId: string, taskId: string): Promise<void> {
    const errorMessage = `${this.providerName} generation timeout after ${DEFAULT_POLLING_CONFIG.timeoutMs / 60000} minutes`;
    
    logger.error(`⏱️ [${this.providerName.toUpperCase()}] Polling timeout`, {
      trackId,
      taskId,
    });

    await this.handleFailedTrack(trackId, errorMessage);
  }
}
