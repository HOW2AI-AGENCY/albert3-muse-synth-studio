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

      // 4. Generate lyrics if needed
      let finalLyrics = params.lyrics;
      if (params.hasVocals !== false && (!finalLyrics || finalLyrics.trim().length === 0)) {
        const lyricsResult = await this.generateLyrics(trackId, params.prompt);
        
        if (!lyricsResult.success) {
          return lyricsResult;
        }

        if (lyricsResult.requiresLyricsSelection) {
          return lyricsResult;
        }

        finalLyrics = lyricsResult.lyrics;
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

      // 7. Start background polling
      this.startPolling(trackId, taskId).catch(err => {
        logger.error(`🔴 [MUREKA] Polling error`, { 
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

    const generatePayload = {
      lyrics: params.lyrics || '',
      prompt: params.prompt || undefined,
      model: params.modelVersion || 'auto',
      n: 2, // Generate 2 variants
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
      
      // Manual extraction from raw response
      if (typeof rawResponse === 'object' && rawResponse !== null) {
        const anyResponse = rawResponse as any;
        if (anyResponse.task_id) {
          taskId = anyResponse.task_id;
        } else if (anyResponse.data?.task_id) {
          taskId = anyResponse.data.task_id;
        }
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
    const queryResult = await murekaClient.queryTask(taskId);

    // ✅ Handle "preparing" status - continue polling
    if (queryResult.data?.status === 'preparing') {
      logger.debug('[MUREKA] Task is preparing, continuing polling', { taskId });
      return {
        status: 'processing',
      };
    }

    const clips = queryResult.data?.clips;
    if (queryResult.code === 200 && clips && clips.length > 0) {
      const clip = clips[0];
      
      return {
        status: 'completed',
        audio_url: clip.audio_url as string | undefined,
        cover_url: clip.image_url as string | undefined,
        duration: (clip.duration as number | undefined) || 0,
        title: (clip.title as string | undefined) || 'Generated Track',
      };
    }

    if (queryResult.code === 500 || queryResult.data?.status === 'failed') {
      return {
        status: 'failed',
        error: queryResult.msg || 'Mureka generation failed',
      };
    }

    // Still processing
    return {
      status: 'processing',
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
