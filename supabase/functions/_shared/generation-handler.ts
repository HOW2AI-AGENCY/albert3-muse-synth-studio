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
      genre: (params as any).genre,
      mood: (params as any).mood,
      provider: this.providerName,
      requestMetadata: metadata,
      idempotencyKey,
      projectId: (params as any).projectId, // ✅ НОВОЕ: передаём project_id
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

    // ✅ FIX: Verify that taskId was actually persisted
    const { data: verifyTrack, error: verifyError } = await this.supabase
      .from('tracks')
      .select('suno_id, mureka_task_id, metadata')
      .eq('id', trackId)
      .single();

    if (verifyError) {
      logger.error(`❌ Failed to verify track update`, { error: verifyError, trackId, taskId });
      throw new Error(`Failed to verify task ID update: ${verifyError.message}`);
    }

    // Check both column and metadata storage
    const storedInColumn = this.providerName === 'suno'
      ? verifyTrack?.suno_id === taskId
      : verifyTrack?.mureka_task_id === taskId;

    const storedInMetadata = (verifyTrack?.metadata as any)?.[taskIdField] === taskId;

    if (!storedInColumn && !storedInMetadata) {
      const errorMsg = `Task ID not persisted correctly. Column: ${storedInColumn}, Metadata: ${storedInMetadata}`;
      logger.error(`❌ ${errorMsg}`, { trackId, taskId, verifyTrack });
      throw new Error(errorMsg);
    }

    logger.info(`✅ Track updated and verified with ${taskIdField}`, {
      trackId,
      taskId,
      storedInColumn,
      storedInMetadata,
    });
  }

  /**
   * Start polling the provider API for completion
   * ✅ FIXED: Stops on failed status, checks DB before each poll, limits consecutive errors
   */
  protected async startPolling(
    trackId: string, 
    taskId: string,
    config: PollingConfig = DEFAULT_POLLING_CONFIG as PollingConfig
  ): Promise<void> {
    const MAX_PROCESSING_TIME = 10 * 60 * 1000; // 10 minutes max for all providers
    const MAX_CONSECUTIVE_ERRORS = 3; // ✅ Stop after 3 consecutive errors
    const pollingStartTime = Date.now();
    let attemptNumber = 0;
    let consecutiveErrors = 0;

    const poll = async (): Promise<void> => {
      const elapsedTime = Date.now() - pollingStartTime;

      // Check timeout FIRST
      if (elapsedTime > MAX_PROCESSING_TIME) {
        logger.error(`🔴 [${this.providerName.toUpperCase()}] Processing timeout reached`, {
          trackId,
          taskId,
          attempts: attemptNumber,
          elapsedTimeMinutes: Math.round(elapsedTime / 60000),
        });
        await this.handleFailedTrack(trackId, `${this.providerName} generation timeout after ${Math.round(elapsedTime / 60000)} minutes (max: 10 min)`);
        return;
      }

      // ✅ Check consecutive errors limit
      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        logger.error(`🔴 [${this.providerName.toUpperCase()}] Too many consecutive errors`, {
          trackId,
          taskId,
          consecutiveErrors,
        });
        await this.handleFailedTrack(trackId, 'Too many consecutive polling errors - provider API may be unavailable');
        return;
      }

      if (attemptNumber >= config.maxAttempts) {
        logger.warn(`⚠️ [${this.providerName.toUpperCase()}] Max polling attempts reached`, {
          trackId,
          taskId,
          attempts: attemptNumber,
        });
        await this.handlePollingTimeout(trackId, taskId);
        return;
      }

      try {
        // ✅ Check DB status FIRST - track may have been updated via callback
        const { data: currentTrack } = await this.supabase
          .from('tracks')
          .select('status')
          .eq('id', trackId)
          .single();
        
        if (currentTrack?.status === 'completed') {
          logger.info(`✅ [${this.providerName.toUpperCase()}] Track already completed (likely via callback)`, { trackId });
          return;
        }
        
        if (currentTrack?.status === 'failed') {
          logger.info(`❌ [${this.providerName.toUpperCase()}] Track already failed, stopping polling`, { trackId });
          return;
        }
        
        // Poll provider API
        const trackData = await this.pollTaskStatus(taskId);
        
        // ✅ Reset consecutive errors on successful poll
        consecutiveErrors = 0;
        
        // Update polling metadata
        const { data: metaTrack } = await this.supabase
          .from('tracks')
          .select('metadata')
          .eq('id', trackId)
          .single();
        const existingMeta = (metaTrack?.metadata && typeof metaTrack.metadata === 'object')
          ? (metaTrack.metadata as Record<string, unknown>)
          : {};
        await this.supabase
          .from('tracks')
          .update({
            metadata: {
              ...existingMeta,
              polling_attempts: attemptNumber + 1,
              last_poll_at: new Date().toISOString(),
              elapsed_time_ms: elapsedTime,
            },
          })
          .eq('id', trackId);

        logger.info(`🔍 [${this.providerName.toUpperCase()}] Poll attempt ${attemptNumber + 1}/${config.maxAttempts}`, {
          trackId,
          taskId,
          status: trackData.status,
          elapsedSeconds: Math.round(elapsedTime / 1000),
        });

        if (trackData.status === 'completed') {
          await this.handleCompletedTrack(trackId, trackData);
          return;
        }

        // ✅ STOP IMMEDIATELY on failed status - don't retry
        if (trackData.status === 'failed') {
          logger.error(`❌ [${this.providerName.toUpperCase()}] Provider reported failure, stopping polling`, {
            trackId,
            taskId,
            error: trackData.error,
          });
          await this.handleFailedTrack(trackId, trackData.error || 'Generation failed');
          return; // Stop polling immediately
        }

        // Continue polling
        attemptNumber++;
        setTimeout(poll, config.intervalMs);

      } catch (error) {
        consecutiveErrors++; // ✅ Increment error counter
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // ✅ Check if error is non-retryable
        const isNonRetryable = errorMessage.toLowerCase().includes('unauthorized') ||
          errorMessage.toLowerCase().includes('insufficient credits') ||
          errorMessage.toLowerCase().includes('недостаточно кредитов') ||
          errorMessage.toLowerCase().includes('invalid') ||
          errorMessage.toLowerCase().includes('bad request');
        
        if (isNonRetryable) {
          logger.error(`🔴 [${this.providerName.toUpperCase()}] Non-retryable error, stopping polling`, {
            error: errorMessage,
            trackId,
            taskId,
          });
          await this.handleFailedTrack(trackId, errorMessage);
          return; // Stop immediately on non-retryable errors
        }
        
        logger.error(`🔴 [${this.providerName.toUpperCase()}] Polling error (${consecutiveErrors}/${MAX_CONSECUTIVE_ERRORS})`, {
          error: errorMessage,
          trackId,
          taskId,
          attempt: attemptNumber + 1,
        });
        
        // Continue polling only for retryable errors
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

      // ✅ FIX: Skip download for placeholder images (relative paths)
      if (trackData.cover_url && !trackData.cover_url.startsWith('/')) {
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
      } else if (trackData.cover_url) {
        // ✅ Use placeholder as-is (relative path)
        finalCoverUrl = trackData.cover_url;
        logger.info(`🖼️ [${this.providerName.toUpperCase()}] Using placeholder cover`, { 
          trackId,
          coverUrl: finalCoverUrl,
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

    // ✅ FIX: Get existing track data for title fallback and metadata merge
    const { data: existingTrack } = await this.supabase
      .from('tracks')
      .select('title, prompt, metadata')
      .eq('id', trackId)
      .single();

    // ✅ STREAMING: Merge provider metadata with existing metadata
    const existingMetadata = existingTrack?.metadata && typeof existingTrack.metadata === 'object' 
      ? existingTrack.metadata as Record<string, unknown> 
      : {};
    const finalMetadata = {
      ...existingMetadata,
      ...trackData.metadata, // Include streaming URLs and other provider-specific data
      completed_at: new Date().toISOString(),
    };
    
    // Prepare update object
    const updateData: any = {
      status: 'completed',
      audio_url: finalAudioUrl,
      cover_url: finalCoverUrl,
      video_url: finalVideoUrl,
      duration: trackData.duration,
      metadata: finalMetadata, // ✅ Include merged metadata with streaming support
      error_message: null, // ✅ FIX: Очистить error_message при успехе
    };

    // ✅ FIX: Title fallback chain: provider → existing → truncated prompt
    if (trackData.title) {
      updateData.title = trackData.title;
      logger.info(`📝 [${this.providerName.toUpperCase()}] Using title from provider`, { 
        trackId, 
        title: trackData.title 
      });
    } else if (!existingTrack?.title || existingTrack.title.trim() === '') {
      // Only update if existing title is empty
      const fallbackTitle = existingTrack?.prompt 
        ? existingTrack.prompt.slice(0, 50).replace(/\s+\S*$/, '') + (existingTrack.prompt.length > 50 ? '...' : '')
        : 'Untitled Track';
      updateData.title = fallbackTitle;
      logger.info(`📝 [${this.providerName.toUpperCase()}] Using fallback title`, { 
        trackId, 
        title: fallbackTitle 
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
    // ✅ FIX: Shorter timeout (2 minutes instead of default)
    const timeoutMinutes = 2;
    const errorMessage = `${this.providerName} generation timeout after ${timeoutMinutes} minutes`;
    
    logger.error(`⏱️ [${this.providerName.toUpperCase()}] Polling timeout`, {
      trackId,
      taskId,
      timeoutMinutes,
    });

    await this.handleFailedTrack(trackId, errorMessage);
  }
}
