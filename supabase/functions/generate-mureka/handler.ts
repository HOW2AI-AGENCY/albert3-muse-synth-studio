/**
 * Mureka Generation Handler
 * 
 * Implements Mureka-specific generation logic:
 * - Mureka O1 System API integration
 * - Automatic lyrics generation
 * - BGM mode support
 * - Multiple variants handling
 */

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GenerationHandler } from "../_shared/generation-handler.ts";
import { createMurekaClient } from "../_shared/mureka.ts";
import { normalizeMurekaLyricsResponse, normalizeMurekaMusicResponse } from "../_shared/mureka-normalizers.ts";
import { logger } from "../_shared/logger.ts";
import { sentryClient } from "../_shared/sentry.ts";
import type { MurekaGenerationParams, ProviderTrackData, GenerationResponse } from "../_shared/types/generation.ts";

export class MurekaGenerationHandler extends GenerationHandler<MurekaGenerationParams> {
  protected providerName = 'mureka' as const;
  private apiKey: string;

  constructor(supabase: SupabaseClient, userId: string, apiKey: string) {
    super(supabase, userId);
    this.apiKey = apiKey;
  }

  protected async validateProviderParams(params: MurekaGenerationParams): Promise<void> {
    // Mureka doesn't have balance check API yet
    // Just validate basic params
    if (!params.prompt) {
      throw new Error('Prompt is required for Mureka generation');
    }
  }

  protected buildMetadata(params: MurekaGenerationParams): Record<string, unknown> {
    return {
      provider: 'mureka',
      isBGM: params.isBGM,
      modelVersion: params.modelVersion,
      originalRequest: {
        prompt: params.prompt,
        lyrics: params.lyrics,
        styleTags: params.styleTags,
      },
    };
  }

  /**
   * Override generate to handle lyrics generation flow
   */
  override async generate(params: MurekaGenerationParams): Promise<GenerationResponse> {
    const startTime = Date.now();
    
    try {
      logger.info(`🎵 [MUREKA] Generation request received`, {
        userId: this.userId,
        promptLength: params.prompt.length,
        hasLyrics: !!params.lyrics,
        hasVocals: params.hasVocals,
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
      
      logger.info(`✅ [MUREKA] Track created`, { trackId });

      // 4. Generate lyrics if needed (with soft fallback)
      let finalLyrics = params.lyrics;
      if (params.hasVocals !== false && (!finalLyrics || finalLyrics.trim().length === 0)) {
        try {
          const lyricsResult = await this.generateLyrics(trackId, params.prompt);
          
          if (!lyricsResult.success) {
            // ✅ FIX: Soft fallback - don't fail entire generation
            logger.warn('⚠️ [MUREKA] Lyrics generation failed, using placeholder', {
              trackId,
              error: lyricsResult.error,
            });
            finalLyrics = `[Instrumental]\n${params.prompt || 'Music'}`;
          } else if (lyricsResult.requiresLyricsSelection) {
            return lyricsResult;
          } else {
            finalLyrics = lyricsResult.lyrics;
          }
        } catch (lyricsError) {
          // ✅ FIX: Catch lyrics errors and continue with placeholder
          logger.warn('⚠️ [MUREKA] Lyrics generation error, using placeholder', {
            trackId,
            error: lyricsError instanceof Error ? lyricsError.message : String(lyricsError),
          });
          finalLyrics = `[Instrumental]\n${params.prompt || 'Music'}`;
        }
      } else if (params.hasVocals === false) {
        logger.info('🎼 Instrumental mode, skipping lyrics generation');
        finalLyrics = undefined;
      }

      // 5. Call Mureka API for music generation
      const taskId = await this.callProviderAPI({ ...params, lyrics: finalLyrics }, trackId);
      
      logger.info(`✅ [MUREKA] API call successful`, { 
        trackId, 
        taskId,
        duration: Date.now() - startTime,
      });

      // 6. Update track with task ID
      await this.updateTrackTaskId(trackId, taskId);
      
      // ✅ FIX: Verify taskId was saved to DB before polling (up to 3 retries)
      let taskIdConfirmed = false;
      for (let i = 0; i < 3; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const { data } = await this.supabase
          .from('tracks')
          .select('mureka_task_id')
          .eq('id', trackId)
          .single();
        
        if (data?.mureka_task_id === taskId) {
          taskIdConfirmed = true;
          logger.info(`✅ [MUREKA] Task ID confirmed in DB`, { trackId, taskId, attempt: i + 1 });
          break;
        }
        
        logger.warn(`⚠️ [MUREKA] Task ID not yet in DB, retry ${i + 1}/3`, { trackId, taskId });
      }
      
      if (!taskIdConfirmed) {
        logger.error(`🔴 [MUREKA] Failed to confirm task ID in DB`, { trackId, taskId });
        throw new Error('Failed to save task ID to database');
      }

      // 7. Start background polling
      this.startPolling(trackId, taskId).catch(err => {
        logger.error(`🔴 [MUREKA] Polling error`, { 
          error: err,
          trackId,
          taskId,
        });
        // ✅ FIX: Mark as failed on polling error
        this.handleFailedTrack(trackId, err instanceof Error ? err.message : String(err)).catch(() => {});
      });

      return {
        success: true,
        trackId,
        taskId,
        message: 'Generation started successfully',
      };

    } catch (error) {
      logger.error(`🔴 [MUREKA] Generation failed`, { 
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

  protected async callProviderAPI(params: MurekaGenerationParams, trackId: string): Promise<string> {
    const murekaClient = createMurekaClient({ apiKey: this.apiKey });

    // ✅ FIX: Ensure lyrics are not empty for Mureka API
    // If no lyrics provided, generate a default prompt-based placeholder
    const lyrics = params.lyrics?.trim() || `[Instrumental]\n${params.prompt || 'Music'}`;

    const generatePayload = {
      lyrics,
      prompt: params.prompt || undefined,
      model: params.modelVersion || 'auto',
      n: 2, // Generate 2 variants
      stream: true, // ✅ Enable streaming for real-time audio preview
    };

    logger.info('🎵 [MUREKA] Calling generateSong API', { 
      payload: generatePayload,
      trackId,
      hasLyrics: !!params.lyrics,
      model: generatePayload.model
    });

    const rawResponse = await murekaClient.generateSong(generatePayload);
    
    // ✅ FALLBACK: Extract task_id even if normalization fails
    let taskId: string | undefined;
    
    try {
      const normalizedMusic = normalizeMurekaMusicResponse(rawResponse);

      if (!normalizedMusic.success || !normalizedMusic.taskId) {
        const errMsg = normalizedMusic.error || 'Mureka API did not return task_id';
        logger.error('🔴 [MUREKA] generateSong returned non-success', { errMsg });
        throw new Error(errMsg);
      }

      taskId = normalizedMusic.taskId;
      
    } catch (normalizationError) {
      logger.warn('⚠️ [MUREKA] Normalization failed, extracting task_id manually', {
        error: normalizationError instanceof Error ? normalizationError.message : String(normalizationError),
        rawResponse,
      });
      
      // Manual extraction from raw response - support snake_case and camelCase
      if (typeof rawResponse === 'object' && rawResponse !== null) {
        const anyResponse = rawResponse as any;
        taskId = anyResponse.task_id || anyResponse.taskId ||
                 anyResponse.data?.task_id || anyResponse.data?.taskId ||
                 undefined;
      }
      
      if (!taskId) {
        logger.error('🔴 [MUREKA] Could not extract task_id from response', { rawResponse });
        throw new Error('Could not extract task_id from Mureka response');
      }
      
      logger.info('✅ [MUREKA] task_id extracted manually', { taskId });
    }

    // Update track with lyrics and metadata
    await this.supabase
      .from('tracks')
      .update({
        lyrics: params.lyrics,
        metadata: {
          originalPrompt: params.prompt,
          generatedLyrics: false,
          murekaModel: generatePayload.model,
          started_at: new Date().toISOString(),
          stage: 'processing_music',
          polling_attempts: 0,
        },
      })
      .eq('id', trackId);

    return taskId;
  }

  protected async pollTaskStatus(taskId: string): Promise<ProviderTrackData> {
    const murekaClient = createMurekaClient({ apiKey: this.apiKey });
    const rawQueryResult = await murekaClient.queryTask(taskId);

    logger.info('🔍 [MUREKA] Raw query result received', { 
      taskId,
      status: rawQueryResult.data?.status,
      hasStreamUrl: !!(rawQueryResult.data?.choices?.[0]?.url || rawQueryResult.data?.clips?.[0]?.url),
      rawResultType: typeof rawQueryResult,
      rawResultKeys: rawQueryResult && typeof rawQueryResult === 'object' ? Object.keys(rawQueryResult) : [],
      rawResultPreview: JSON.stringify(rawQueryResult).substring(0, 800),
    });

    // ✅ Use normalizer to handle all response formats
    const normalized = normalizeMurekaMusicResponse(rawQueryResult);
    
    if (!normalized.success) {
      logger.error('🔴 [MUREKA] Failed to normalize query response', {
        taskId,
        error: normalized.error,
        rawResponseSnippet: JSON.stringify(rawQueryResult).substring(0, 500),
      });
      return {
        status: 'failed',
        error: normalized.error || 'Failed to parse Mureka response',
      };
    }

    logger.info('✅ [MUREKA] Normalized query result', { 
      taskId,
      status: normalized.status,
      clipsCount: normalized.clips.length,
      hasAudioInFirstClip: normalized.clips.length > 0 ? !!normalized.clips[0].audio_url : false,
    });

    // Map normalized status to ProviderTrackData status
    if (normalized.status === 'pending' || normalized.status === 'processing') {
      return { status: 'processing' };
    }

    if (normalized.status === 'failed') {
      return {
        status: 'failed',
        error: normalized.error || 'Mureka generation failed',
      };
    }

    // ✅ Status is 'completed' - extract track data
    if (normalized.clips.length === 0) {
      logger.warn('[MUREKA] No clips in completed response', { taskId });
      return {
        status: 'failed',
        error: 'No audio tracks in completed response',
      };
    }

    const primaryClip = normalized.clips[0];
    
    // ✅ STREAMING: Detect if streaming URL is available (temporary preview)
    const streamingUrl = primaryClip.url || primaryClip.audio_url;
    const hasStreamingPreview = !!streamingUrl && streamingUrl.includes('stream');
    
    logger.info('🎵 [MUREKA] Primary clip detailed data', {
      taskId,
      clipId: primaryClip.id,
      hasAudioUrl: !!primaryClip.audio_url,
      audioUrl: primaryClip.audio_url?.substring(0, 100),
      audioUrlLength: primaryClip.audio_url?.length,
      hasStreamingUrl: hasStreamingPreview,
      streamingUrl: hasStreamingPreview ? streamingUrl?.substring(0, 100) : null,
      hasCoverUrl: !!(primaryClip.image_url || primaryClip.cover_url),
      coverUrl: (primaryClip.image_url || primaryClip.cover_url)?.substring(0, 80),
      title: primaryClip.title || primaryClip.name,
      duration: primaryClip.duration,
      allClipFields: Object.keys(primaryClip),
    });
    
    // ✅ Save ALL clips as track_versions (including primary as variant_index=0)
    // ✅ FIX: Improved retry logic with exponential backoff
    let trackRecord = null;
    let retries = 0;
    const MAX_RETRIES = 5;
    const RETRY_DELAYS = [500, 1000, 2000, 3000, 5000];
    
    while (!trackRecord && retries < MAX_RETRIES) {
      const { data, error } = await this.supabase
        .from('tracks')
        .select('id, user_id, title')
        .eq('mureka_task_id', taskId)
        .maybeSingle();
      
      if (!data && !error) {
        const delay = RETRY_DELAYS[retries];
        logger.info(`⏳ [MUREKA] Track not found yet, retry ${retries + 1}/${MAX_RETRIES} in ${delay}ms`, { taskId });
        await new Promise(resolve => setTimeout(resolve, delay));
        retries++;
        continue;
      }
      
      if (error) {
        logger.error('❌ [MUREKA] Error fetching track', { error, taskId });
        break;
      }
      
      trackRecord = { data, error: null };
    }
    
    if (trackRecord?.data && normalized.clips.length > 0) {
      const trackData = trackRecord.data;
      
      logger.info('💾 [MUREKA] Saving ALL track variants (including primary)', {
        trackId: trackData.id,
        totalClips: normalized.clips.length,
      });
      
      // ✅ Check existing variants to prevent duplicates
      const { data: existingVariants } = await this.supabase
        .from('track_versions')
        .select('variant_index')
        .eq('parent_track_id', trackData.id);
      
      const existingIndexes = new Set((existingVariants || []).map(v => v.variant_index));
      
      // ✅ FIX: Global cover fallback - search across all clips
      const findAnyCoverUrl = (): string | null => {
        for (const clip of normalized.clips) {
          if (clip.image_url) return clip.image_url;
          if (clip.cover_url) return clip.cover_url;
        }
        return null;
      };
      
      const fallbackCoverUrl = findAnyCoverUrl();
      
      if (!fallbackCoverUrl) {
        logger.warn('⚠️ [MUREKA] No cover image in any clip', {
          taskId,
          clipsCount: normalized.clips.length,
        });
      }
      
      // ✅ FIX: Создаём версии ТОЛЬКО для дополнительных клипов (не primary)
      // Primary clip данные идут в основной track через finalizePrimaryTrack
      const versionsToInsert = normalized.clips
        .slice(1) // ✅ Пропускаем первый клип (он идёт в основной track)
        .map((clip, arrayIndex) => {
          const variantIndex = arrayIndex + 1; // ✅ Начинаем с 1, т.к. 0 - это primary track
          
          if (existingIndexes.has(variantIndex)) {
            logger.info(`⏭️ [MUREKA] Variant ${variantIndex} already exists, skipping`, {
              trackId: trackData.id,
              variantIndex,
            });
            return null;
          }
          
          // ✅ Convert duration from milliseconds to seconds if needed
          const durationInSeconds = clip.duration 
            ? (clip.duration > 1000 ? Math.floor(clip.duration / 1000) : clip.duration)
            : null;
          
          return {
            parent_track_id: trackData.id,
            variant_index: variantIndex,
            is_primary_variant: false,
            is_preferred_variant: false,
            audio_url: clip.audio_url || null,
            // ✅ FIX: Используем глобальный fallback для обложки + Mureka placeholder
            cover_url: clip.image_url || clip.cover_url || fallbackCoverUrl || '/images/mureka-placeholder.webp',
            video_url: clip.video_url || null,
            lyrics: clip.lyrics || null,
            duration: durationInSeconds,
            suno_id: clip.id || null,
            metadata: {
              mureka_clip_id: clip.id,
              created_at: clip.created_at,
              tags: clip.tags,
              title: clip.title || clip.name || `${trackData.title || 'Track'} (V${variantIndex + 1})`,
            },
          };
        })
        .filter(Boolean);
      
      if (versionsToInsert.length === 0) {
        logger.info('ℹ️ [MUREKA] No additional variants to save (only primary track)', { trackId: trackData.id });
      } else {
        const { error: versionsError } = await this.supabase
          .from('track_versions')
          .insert(versionsToInsert);
        
        if (versionsError) {
          logger.error('❌ [MUREKA] Failed to save additional track versions', {
            error: versionsError,
            errorMessage: versionsError.message,
            trackId: trackData.id,
            versionsCount: versionsToInsert.length,
          });
        } else {
          logger.info('✅ [MUREKA] Additional track versions saved', {
            trackId: trackData.id,
            versionsCount: versionsToInsert.length,
          });
        }
      }
    }

    // ✅ FIX: Validate audio_url before returning - this should never happen now due to normalizer validation
    const audioUrl = primaryClip.audio_url;
    if (!audioUrl || audioUrl.trim() === '') {
      logger.error('🔴 [MUREKA] CRITICAL: No valid audio_url in completed track after normalization', { 
        taskId, 
        clipId: primaryClip.id,
        primaryClipKeys: Object.keys(primaryClip),
        rawClipData: primaryClip,
      });
      return {
        status: 'failed',
        error: 'No audio URL in completed response. This should not happen after normalizer validation.',
      };
    }
    
    logger.info('✅ [MUREKA] Audio URL validated successfully', {
      taskId,
      audioUrlPreview: audioUrl.substring(0, 100),
      audioUrlValid: true,
    });

    // ✅ Convert duration from milliseconds to seconds if needed
    const durationInSeconds = primaryClip.duration 
      ? (primaryClip.duration > 1000 ? Math.floor(primaryClip.duration / 1000) : primaryClip.duration)
      : 0;

    // ✅ STREAMING: Include streaming URL in metadata for real-time preview
    const metadata: Record<string, unknown> = {
      mureka_clip_id: primaryClip.id,
      created_at: primaryClip.created_at,
      tags: primaryClip.tags,
    };
    
    // Add streaming URL if available (temporary preview during generation)
    if (hasStreamingPreview && streamingUrl) {
      metadata.stream_audio_url = streamingUrl;
      logger.info('🎬 [MUREKA] Streaming URL available for preview', {
        taskId,
        streamUrl: streamingUrl.substring(0, 100),
      });
    }
    
    return {
      status: 'completed',
      audio_url: audioUrl,
      // ✅ FIX: Надёжный fallback для cover с Mureka placeholder
      cover_url: primaryClip.image_url || primaryClip.cover_url || 
                 normalized.clips.find(c => c.image_url || c.cover_url)?.image_url ||
                 normalized.clips.find(c => c.image_url || c.cover_url)?.cover_url ||
                 '/images/mureka-placeholder.webp',
      video_url: primaryClip.video_url || undefined,
      duration: durationInSeconds,
      // ✅ FIX: Используем реальное название из API, fallback на оригинальный title из track
      title: primaryClip.title || primaryClip.name || undefined,
      metadata, // ✅ Include streaming metadata
    };
  }

  // ============= Private Helper Methods =============

  private async generateLyrics(trackId: string, prompt: string): Promise<GenerationResponse & { lyrics?: string }> {
    logger.info('📝 No lyrics provided, generating lyrics from prompt');
    
    // Update track to show lyrics generation stage
    await this.supabase
      .from('tracks')
      .update({
        metadata: {
          stage: 'generating_lyrics',
          stage_description: 'Генерация текста песни...',
        }
      })
      .eq('id', trackId);
    
    try {
      const murekaClient = createMurekaClient({ apiKey: this.apiKey });
      const lyricsResult = await murekaClient.generateLyrics({ prompt });
      
      logger.info('🎤 [MUREKA] Lyrics API response received');
      
      const normalized = normalizeMurekaLyricsResponse(lyricsResult);

      if (!normalized.success) {
        logger.error('[MUREKA] Lyrics generation failed', {
          error: normalized.error,
          trackId,
        });

        sentryClient.captureException(new Error(normalized.error || "Lyrics generation failed"), {
          tags: { provider: "mureka", stage: "lyrics_generation", trackId },
        });

        const errorMessage = `Ошибка генерации текста: ${normalized.error}. Попробуйте снова или укажите текст вручную.`;
        
        await this.supabase
          .from('tracks')
          .update({
            status: 'failed',
            error_message: errorMessage,
            metadata: {
              stage: 'lyrics_generation_failed',
              error: normalized.error,
              timestamp: new Date().toISOString()
            }
          })
          .eq('id', trackId);

        return {
          success: false,
          error: errorMessage,
          trackId,
          suggestion: 'Укажите текст песни вручную или измените промпт'
        };
      }

      if (normalized.variants.length === 0) {
        const errorMsg = "No lyrics returned from Mureka API";
        logger.error(`[MUREKA] ${errorMsg}`, { trackId });

        sentryClient.captureException(new Error(errorMsg), {
          tags: { provider: "mureka", stage: "lyrics_generation", trackId },
        });

        throw new Error(errorMsg);
      }

      const lyricsVariants = normalized.variants;
      logger.info('✅ Lyrics generated successfully', {
        variantsCount: lyricsVariants.length,
        firstVariantLength: lyricsVariants[0]?.text?.length
      });

      // If multiple variants, save to database and require user selection
      if (lyricsVariants.length > 1) {
        const { data: jobData, error: jobError } = await this.supabase
          .from('lyrics_jobs')
          .insert({
            user_id: this.userId,
            track_id: trackId,
            status: 'completed',
            prompt: prompt,
            provider: 'mureka',
            metadata: { source: 'mureka_generate' }
          })
          .select('id')
          .single();
        
        if (jobError || !jobData) {
          logger.error('Failed to create lyrics job', { error: jobError });
        } else {
          const { error: variantsError } = await this.supabase
            .from('lyrics_variants')
            .insert(
              lyricsVariants.map((variant, idx) => ({
                job_id: jobData.id,
                variant_index: idx,
                content: variant.text,
                title: variant.title,
                status: variant.status || 'complete',
                error_message: variant.errorMessage
              }))
            );
          
          if (variantsError) {
            logger.error('Failed to save lyrics variants', { error: variantsError });
          } else {
            logger.info('✅ Multiple lyrics variants saved', {
              trackId,
              jobId: jobData.id,
              variantsCount: lyricsVariants.length
            });
            
            // Update metadata to require user selection
            await this.supabase
              .from('tracks')
              .update({
                lyrics: lyricsVariants[0].text,
                metadata: {
                  stage: 'lyrics_selection',
                  lyrics_job_id: jobData.id,
                  has_multiple_lyrics_variants: true,
                  variants_count: lyricsVariants.length
                }
              })
              .eq('id', trackId);
            
            return {
              success: true,
              trackId,
              message: 'Lyrics generated, awaiting variant selection',
              requiresLyricsSelection: true,
              jobId: jobData.id,
            };
          }
        }
      }

      // Single variant - use it directly
      const finalLyrics = lyricsVariants[0].text;
      
      // Update track with generated lyrics
      await this.supabase
        .from('tracks')
        .update({
          lyrics: finalLyrics,
          metadata: {
            stage: 'composing_music',
            stage_description: 'Создание музыки...',
            generatedLyrics: true,
          }
        })
        .eq('id', trackId);
      
      return {
        success: true,
        trackId,
        message: 'Lyrics generated successfully',
        lyrics: finalLyrics,
      };

    } catch (lyricsError) {
      const errorMessage = lyricsError instanceof Error ? lyricsError.message : String(lyricsError);
      
      logger.error('🔴 [MUREKA] Lyrics generation failed', {
        error: lyricsError,
        errorMessage,
        prompt: prompt.substring(0, 100),
        trackId
      });
      
      const userErrorMessage = `Ошибка генерации текста: ${errorMessage}. Попробуйте снова или укажите текст вручную.`;
      
      await this.supabase
        .from('tracks')
        .update({
          status: 'failed',
          error_message: userErrorMessage,
          metadata: {
            stage: 'lyrics_generation_failed',
            error: errorMessage,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', trackId);
      
      return {
        success: false,
        error: userErrorMessage,
        trackId,
        suggestion: 'Укажите текст песни вручную или измените промпт'
      };
    }
  }
}
