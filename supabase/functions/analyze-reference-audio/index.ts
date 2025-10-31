/**
 * @fileoverview Unified Reference Audio Analysis Edge Function
 * @description
 * Комплексный анализ референсного аудио через Mureka AI:
 * - Song Recognition (распознавание названия, исполнителя, альбома)
 * - Song Description (жанр, настроение, инструменты, темп, BPM)
 * 
 * Запускает оба анализа параллельно и сохраняет результаты в БД.
 * Background polling обновляет статусы задач до их завершения.
 * 
 * @module analyze-reference-audio
 * @version 1.0.0
 * @since 2025-10-15
 * 
 * @example
 * ```typescript
 * // Frontend call
 * const { data } = await supabase.functions.invoke('analyze-reference-audio', {
 *   body: { audioUrl: 'https://example.com/audio.mp3' }
 * });
 * console.log('Recognition ID:', data.recognitionId);
 * console.log('Description ID:', data.descriptionId);
 * ```
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logger, withSentry } from "../_shared/logger.ts";
import { createMurekaClient, MurekaApiError } from "../_shared/mureka.ts";
import {
  createSupabaseAdminClient,
  createSupabaseUserClient,
} from "../_shared/supabase.ts";
import { validateRequest, validationSchemas, ValidationException } from "../_shared/validation.ts";

// ============================================================================
// TYPES
// ============================================================================

interface AnalyzeReferenceAudioRequest {
  /** URL аудиофайла для анализа */
  audioUrl: string;
  /** ID трека (опционально) */
  trackId?: string;
}

interface AnalyzeReferenceAudioResponse {
  success: boolean;
  /** ID записи в song_recognitions */
  recognitionId?: string;
  /** ID записи в song_descriptions */
  descriptionId?: string;
  /** Mureka file_id для повторного использования */
  uploadedFileId: string;
  /** Частичные результаты (если уже доступны) */
  analysis?: {
    recognition?: {
      title?: string;
      artist?: string;
      confidence?: number;
    };
    description?: {
      genre?: string;
      mood?: string;
      instruments?: string[];
      tempo_bpm?: number;
    };
  };
}

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

const mainHandler = async (req: Request): Promise<Response> => {
  // ✅ OPTIONS request для CORS
  if (req.method === "OPTIONS") {
    const response = handleCorsPreflightRequest(req);
    return new Response(null, { status: response.status, headers: corsHeaders });
  }

  try {
    logger.info('🎵 [ANALYZE-REF] Handler entry', {
      method: req.method,
      hasXUserId: !!req.headers.get('X-User-Id'),
      timestamp: new Date().toISOString()
    });

    // ✅ Extract userId from X-User-Id header (set by middleware)
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      logger.error('🔴 [ANALYZE-REF] Missing X-User-Id header from middleware');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing user context' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`[ANALYZE-REF] ✅ User context from middleware: userId=${userId.substring(0, 8)}...`);

    // ✅ Validate request body
    const body = await validateRequest(req, validationSchemas.analyzeReferenceAudio) as AnalyzeReferenceAudioRequest;
    const { audioUrl, trackId } = body;

    logger.info('[ANALYZE-REF] 📋 Request details', { 
      audioUrl: audioUrl.substring(0, 100),
      trackId: trackId ?? 'null',
      userId: userId.substring(0, 8)
    });

    // ✅ Check Mureka API key
    const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
    if (!MUREKA_API_KEY) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
    const supabaseAdmin = createSupabaseAdminClient();

    // ============================================================================
    // STEP 1: Download audio and upload to Mureka
    // ============================================================================
    
    logger.info('[ANALYZE-REF] 📥 Downloading audio from URL', { 
      url: audioUrl.substring(0, 100) 
    });

    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.status}`);
    }

    const audioBlob = await audioResponse.blob();
    logger.info('[ANALYZE-REF] 📦 Audio downloaded', { 
      size: audioBlob.size,
      type: audioBlob.type 
    });

    // ✅ Normalize MIME type based on URL extension if missing or generic
    const inferExt = (url: string): string => {
      const m = url.toLowerCase().match(/\.([a-z0-9]+)(?:\?|#|$)/);
      return m ? m[1] : '';
    };
    const ext = inferExt(audioUrl);
    const mimeByExt: Record<string, string> = {
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      flac: 'audio/flac',
      aac: 'audio/aac',
      m4a: 'audio/mp4',
      mp4: 'audio/mp4'
    };
    const normalizedType = audioBlob.type && audioBlob.type !== 'application/octet-stream'
      ? audioBlob.type
      : (mimeByExt[ext] || 'audio/mpeg');

logger.info('[ANALYZE-REF] 📤 Uploading to Mureka (normalized format)', {
  originalType: audioBlob.type,
  normalizedType,
  audioSize: audioBlob.size
});
const filename = `reference.${ext || 'mp3'}`;
const fileForUpload = new File([audioBlob], filename, { type: normalizedType });
const uploadResult = await murekaClient.uploadFile(fileForUpload);

    if (uploadResult.code !== 200 || !uploadResult.data?.file_id) {
      throw new Error('Mureka file upload failed');
    }

    const fileId = uploadResult.data.file_id;
    logger.info('[ANALYZE-REF] ✅ File uploaded to Mureka', { 
      fileId,
      fileSize: uploadResult.data.file_size 
    });

    // ============================================================================
    // STEP 2: Запуск Song Recognition (параллельно)
    // ============================================================================

    logger.info('[ANALYZE-REF] 🔍 Initiating song recognition');
    const recognitionPromise = murekaClient.recognizeSong({ audio_file: fileId, file_id: fileId } as any);

    // ============================================================================
    // STEP 3: Запуск Song Description (параллельно)
    // ============================================================================

    logger.info('[ANALYZE-REF] 📖 Initiating song description');
    const descriptionPromise = murekaClient.describeSong({ audio_file: fileId, file_id: fileId } as any);

    // ✅ Параллельное выполнение обоих запросов
    const [recognitionResult, descriptionResult] = await Promise.all([
      recognitionPromise,
      descriptionPromise
    ]);

    logger.info('[ANALYZE-REF] ✅ Both tasks initiated', {
      recognitionTaskId: recognitionResult.data.task_id,
      descriptionTaskId: descriptionResult.data.task_id
    });

    // ============================================================================
    // STEP 4: Создание записей в БД
    // ============================================================================

    // 4.1 Create song_recognitions record
    const { data: recognitionRecord, error: recognitionError } = await supabaseAdmin
      .from('song_recognitions')
      .insert({
        user_id: userId,
        audio_file_url: audioUrl,
        mureka_file_id: fileId,
        mureka_task_id: recognitionResult.data.task_id,
        status: 'pending',
        metadata: {
          upload_size: uploadResult.data.file_size,
          initiated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (recognitionError || !recognitionRecord) {
      logger.error('[ANALYZE-REF] Failed to create recognition record', { recognitionError });
      throw new Error('Failed to create recognition record');
    }

    logger.info('[ANALYZE-REF] ✅ Recognition record created', { 
      recognitionId: recognitionRecord.id 
    });

    // 4.2 Create song_descriptions record
    const { data: descriptionRecord, error: descriptionError } = await supabaseAdmin
      .from('song_descriptions')
      .insert({
        user_id: userId,
        track_id: trackId ?? null,
        audio_file_url: audioUrl,
        mureka_file_id: fileId,
        mureka_task_id: descriptionResult.data.task_id,
        status: 'pending',
        metadata: {
          upload_size: uploadResult.data.file_size,
          initiated_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (descriptionError || !descriptionRecord) {
      logger.error('[ANALYZE-REF] Failed to create description record', { descriptionError });
      throw new Error('Failed to create description record');
    }

    logger.info('[ANALYZE-REF] ✅ Description record created', { 
      descriptionId: descriptionRecord.id 
    });

    // ============================================================================
    // STEP 5: Background polling для обеих задач
    // ============================================================================

    // ✅ Используем Promise без await для background execution
    pollMurekaAnalysis(
      recognitionResult.data.task_id,
      descriptionResult.data.task_id,
      recognitionRecord.id,
      descriptionRecord.id,
      fileId
    ).catch((error) => {
      logger.error('[ANALYZE-REF] Background polling error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    });

    logger.info('[ANALYZE-REF] 🚀 Background polling started');

    // ============================================================================
    // STEP 6: Return response
    // ============================================================================

    const response: AnalyzeReferenceAudioResponse = {
      success: true,
      recognitionId: recognitionRecord.id,
      descriptionId: descriptionRecord.id,
      uploadedFileId: fileId,
      // Можем вернуть пустой analysis объект, который будет заполнен после polling
      analysis: undefined
    };

    logger.info('[ANALYZE-REF] ✨ Request completed', {
      recognitionId: recognitionRecord.id,
      descriptionId: descriptionRecord.id,
      uploadedFileId: fileId
    });

    return new Response(
      JSON.stringify(response),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    logger.error('[ANALYZE-REF] Error', { 
      error: error instanceof Error ? error : new Error(String(error)) 
    });

    if (error instanceof ValidationException) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: error.errors }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (error instanceof MurekaApiError) {
      const status = error.statusCode ?? 500;
      return new Response(
        JSON.stringify({
          error: error.message,
          details: {
            statusCode: error.statusCode,
            responseBody: error.responseBody
          }
        }),
        { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

// ============================================================================
// BACKGROUND POLLING FUNCTION
// ============================================================================

/**
 * Опрашивает Mureka API для получения результатов обеих задач
 * Обновляет записи в БД по мере готовности результатов
 */
async function pollMurekaAnalysis(
  recognitionTaskId: string,
  descriptionTaskId: string,
  recognitionId: string,
  descriptionId: string,
  fileId: string
): Promise<void> {
  const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
  if (!MUREKA_API_KEY) {
    logger.error('[ANALYZE-REF-POLL] MUREKA_API_KEY not configured');
    return;
  }

  const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
  const supabaseAdmin = createSupabaseAdminClient();

  const MAX_ATTEMPTS = 40; // 40 * 5s = 3 минуты максимум
  const POLL_INTERVAL_MS = 5000; // 5 секунд

  logger.info('[ANALYZE-REF-POLL] 🔄 Background polling started', {
    recognitionTaskId,
    descriptionTaskId,
    recognitionId: recognitionId.substring(0, 8),
    descriptionId: descriptionId.substring(0, 8)
  });

  let recognitionCompleted = false;
  let descriptionCompleted = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    logger.debug(`[ANALYZE-REF-POLL] Attempt ${attempt}/${MAX_ATTEMPTS}`, {
      recognitionCompleted,
      descriptionCompleted
    });

    // ============================================================================
    // Poll Recognition Task
    // ============================================================================
    
    if (!recognitionCompleted) {
      try {
        // ✅ Query recognition task status by taskId
        const recogStatus = await murekaClient.queryTask(recognitionTaskId) as any;
        logger.debug('[ANALYZE-REF-POLL] Recognition status', { 
          taskId: recognitionTaskId,
          hasResult: !!recogStatus?.data?.result
        });

        if (recogStatus.code === 200 && recogStatus.data.result) {
          const result = recogStatus.data.result;

          await supabaseAdmin
            .from('song_recognitions')
            .update({
              status: 'completed',
              recognized_title: result.title,
              recognized_artist: result.artist,
              recognized_album: result.album,
              release_date: result.release_date,
              confidence_score: result.confidence,
              external_ids: result.external_ids ?? {},
              metadata: {
                completed_at: new Date().toISOString(),
                mureka_file_id: fileId
              }
            })
            .eq('id', recognitionId);

          logger.info('[ANALYZE-REF-POLL] ✅ Recognition completed', {
            recognitionId: recognitionId.substring(0, 8),
            title: result.title,
            artist: result.artist,
            confidence: result.confidence
          });

          recognitionCompleted = true;
        } else if (recogStatus.code !== 200) {
          await supabaseAdmin
            .from('song_recognitions')
            .update({
              status: 'failed',
              error_message: recogStatus.msg || 'Mureka recognition task failed'
            })
            .eq('id', recognitionId);

          logger.error('[ANALYZE-REF-POLL] ❌ Recognition failed', { 
            recognitionTaskId,
            code: recogStatus.code,
            msg: recogStatus.msg
          });
          recognitionCompleted = true;
        }
      } catch (error) {
        logger.error('[ANALYZE-REF-POLL] Recognition polling error', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    // ============================================================================
    // Poll Description Task
    // ============================================================================
    
    if (!descriptionCompleted) {
      try {
        // ✅ Query description task status by taskId
        const descStatus = await murekaClient.queryTask(descriptionTaskId) as any;
        logger.debug('[ANALYZE-REF-POLL] Description status', { 
          taskId: descriptionTaskId,
          hasDescription: !!descStatus?.data?.description
        });

        if (descStatus.code === 200 && descStatus.data.description) {
          const desc = descStatus.data.description;

          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'completed',
              ai_description: desc.text,
              detected_genre: desc.genre,
              detected_mood: desc.mood,
              detected_instruments: desc.instruments ?? [],
              tempo_bpm: desc.tempo_bpm,
              key_signature: desc.key,
              energy_level: desc.energy_level,
              danceability: desc.danceability,
              valence: desc.valence,
              metadata: {
                completed_at: new Date().toISOString(),
                mureka_file_id: fileId
              }
            })
            .eq('id', descriptionId);

          logger.info('[ANALYZE-REF-POLL] ✅ Description completed', {
            descriptionId: descriptionId.substring(0, 8),
            genre: desc.genre,
            mood: desc.mood,
            tempo_bpm: desc.tempo_bpm
          });

          descriptionCompleted = true;
        } else if (descStatus.code !== 200) {
          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'failed',
              error_message: descStatus.msg || 'Mureka description task failed'
            })
            .eq('id', descriptionId);

          logger.error('[ANALYZE-REF-POLL] ❌ Description failed', { 
            descriptionTaskId,
            code: descStatus.code,
            msg: descStatus.msg
          });
          descriptionCompleted = true;
        }
      } catch (error) {
        logger.error('[ANALYZE-REF-POLL] Description polling error', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    // ✅ Завершаем, если обе задачи готовы
    if (recognitionCompleted && descriptionCompleted) {
      logger.info('[ANALYZE-REF-POLL] 🎉 Both tasks completed', {
        recognitionId: recognitionId.substring(0, 8),
        descriptionId: descriptionId.substring(0, 8),
        attempts: attempt
      });
      return;
    }
  }

  // ⚠️ Timeout - обе задачи не завершились за MAX_ATTEMPTS
  logger.warn('[ANALYZE-REF-POLL] ⏰ Polling timeout', {
    recognitionCompleted,
    descriptionCompleted,
    maxAttempts: MAX_ATTEMPTS
  });

  if (!recognitionCompleted) {
    await supabaseAdmin
      .from('song_recognitions')
      .update({
        status: 'failed',
        error_message: 'Polling timeout - task did not complete in time'
      })
      .eq('id', recognitionId);
  }

  if (!descriptionCompleted) {
    await supabaseAdmin
      .from('song_descriptions')
      .update({
        status: 'failed',
        error_message: 'Polling timeout - task did not complete in time'
      })
      .eq('id', descriptionId);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

const rateLimitedHandler = withRateLimit(mainHandler, {
  maxRequests: 10,
  windowMinutes: 1,
  endpoint: 'analyze-reference-audio',
});

const handler = withSentry(rateLimitedHandler, { transaction: 'analyze-reference-audio' });

serve(handler);
