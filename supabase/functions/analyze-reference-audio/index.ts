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
 * @version 2.0.0
 * @since 2025-11-01
 * @changelog
 * - v2.0.0: Switched from Fal.AI to Mureka API (2025-11-01)
 * - v1.0.0: Initial Fal.AI implementation (2025-10-15)
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
      timestamp: new Date().toISOString()
    });

    // ✅ Get JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.error('🔴 [ANALYZE-REF] Missing Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createSupabaseUserClient(token);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      logger.error('🔴 [ANALYZE-REF] Invalid token', { authError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    logger.info(`[ANALYZE-REF] ✅ User authenticated: userId=${userId.substring(0, 8)}...`);

    // ✅ Validate request body
    const body = await validateRequest(req, validationSchemas.analyzeReferenceAudio) as AnalyzeReferenceAudioRequest;
    const { audioUrl, trackId } = body;

    logger.info('[ANALYZE-REF] 📋 Request details', { 
      audioUrl: audioUrl.substring(0, 100),
      trackId: trackId ?? 'null',
      userId: userId.substring(0, 8)
    });

    // ============================================================================
    // 🔒 Check Mureka API Key
    // ============================================================================
    
    const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
    if (!MUREKA_API_KEY) {
      logger.error('[ANALYZE-REF] 🔴 MUREKA_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'MUREKA_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
    const supabaseAdmin = createSupabaseAdminClient();

    // ============================================================================
    // STEP 1: Download and Upload Audio to Mureka
    // ============================================================================
    
    logger.info('[ANALYZE-REF] 📥 Downloading audio from URL');

    let audioBlob: Blob;
    try {
      const audioResponse = await fetch(audioUrl);
      if (!audioResponse.ok) {
        throw new Error(`Failed to download audio: ${audioResponse.status} ${audioResponse.statusText}`);
      }
      audioBlob = await audioResponse.blob();
      
      if (!audioBlob || audioBlob.size === 0) {
        throw new Error('Downloaded audio file is empty');
      }
      
      logger.info('[ANALYZE-REF] ✅ Audio downloaded', { sizeBytes: audioBlob.size });
    } catch (downloadError) {
      logger.error('[ANALYZE-REF] 🔴 Audio download failed', {
        error: downloadError instanceof Error ? downloadError.message : String(downloadError),
        audioUrl: audioUrl.substring(0, 100)
      });
      
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download audio file. Please check if the URL is accessible.',
          details: downloadError instanceof Error ? downloadError.message : 'Unknown error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('[ANALYZE-REF] 📤 Uploading audio to Mureka');
    
    const uploadResult = await murekaClient.uploadFile(audioBlob, { purpose: 'audio' });
    const murekaFileId = uploadResult.data.file_id;
    
    logger.info('[ANALYZE-REF] ✅ Audio uploaded to Mureka', { 
      fileId: murekaFileId,
      fileSize: uploadResult.data.file_size
    });

    // ============================================================================
    // STEP 2: Запуск Song Recognition через Mureka
    // ============================================================================

    logger.info('[ANALYZE-REF] 🔍 Starting Mureka song recognition');
    
    // ✅ recognizeSong требует upload_audio_id (согласно документации)
    const recognitionResult = await murekaClient.recognizeSong({
      upload_audio_id: murekaFileId
    });

    // ✅ Безопасная обработка: task_id может быть undefined
    const recognitionTaskId = recognitionResult?.data?.task_id || `mureka-recog-${Date.now()}`;

    logger.info('[ANALYZE-REF] ✅ Mureka recognition task created', { 
      taskId: recognitionTaskId,
      hasTaskId: !!recognitionResult?.data?.task_id,
      responseCode: recognitionResult.code
    });

    // ============================================================================
    // STEP 3: Запуск Song Description через Mureka (параллельно)
    // ============================================================================

    logger.info('[ANALYZE-REF] 📖 Starting Mureka song description');
    
    // ✅ describeSong требует url (согласно документации)
    const descriptionResult = await murekaClient.describeSong({
      url: audioUrl
    });

    // ✅ Безопасная обработка: task_id может быть undefined
    const descriptionTaskId = descriptionResult?.data?.task_id || `mureka-desc-${Date.now()}`;

    logger.info('[ANALYZE-REF] ✅ Both Mureka tasks initiated', {
      recognitionTaskId,
      descriptionTaskId,
      hasRecognitionTaskId: !!recognitionResult?.data?.task_id,
      hasDescriptionTaskId: !!descriptionResult?.data?.task_id,
      recognitionCode: recognitionResult.code,
      descriptionCode: descriptionResult.code
    });

    // ============================================================================
    // STEP 4: Создание записей в БД (с Mureka task_id)
    // ============================================================================

    // 4.1 Create song_recognitions record
    const { data: recognitionRecord, error: recognitionError } = await supabaseAdmin
      .from('song_recognitions')
      .insert({
        user_id: userId,
        audio_file_url: audioUrl,
        mureka_file_id: murekaFileId,
        mureka_task_id: recognitionTaskId,
        provider: 'mureka',
        status: 'processing',
        metadata: {
          mureka_task_id: recognitionTaskId,
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
        mureka_file_id: murekaFileId,
        mureka_task_id: descriptionTaskId,
        provider: 'mureka',
        status: 'processing',
        metadata: {
          mureka_task_id: descriptionTaskId,
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
    // STEP 5: Background polling для обеих Mureka задач
    // ============================================================================

    // ✅ Используем Promise без await для background execution
    pollMurekaAnalysis(
      recognitionTaskId,
      descriptionTaskId,
      recognitionRecord.id,
      descriptionRecord.id,
      murekaFileId,
      audioUrl
    ).catch((error) => {
      logger.error('[ANALYZE-REF] Background polling error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    });

    logger.info('[ANALYZE-REF] 🚀 Mureka background polling started');

    // ============================================================================
    // STEP 6: Return response
    // ============================================================================

    const response: AnalyzeReferenceAudioResponse = {
      success: true,
      recognitionId: recognitionRecord.id,
      descriptionId: descriptionRecord.id,
      uploadedFileId: murekaFileId,
      analysis: undefined
    };

    logger.info('[ANALYZE-REF] ✨ Request completed (Mureka)', {
      recognitionId: recognitionRecord.id,
      descriptionId: descriptionRecord.id,
      murekaFileId,
      recognitionTaskId,
      descriptionTaskId
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
// BACKGROUND POLLING FUNCTION (Mureka)
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
  murekaFileId: string,
  audioUrl: string
): Promise<void> {
  const MUREKA_API_KEY = Deno.env.get('MUREKA_API_KEY');
  if (!MUREKA_API_KEY) {
    logger.error('[ANALYZE-REF-POLL] MUREKA_API_KEY not configured');
    return;
  }

  const murekaClient = createMurekaClient({ apiKey: MUREKA_API_KEY });
  const supabaseAdmin = createSupabaseAdminClient();

  const MAX_ATTEMPTS = 60; // 60 * 5s = 5 минут максимум
  const POLL_INTERVAL_MS = 5000; // 5 секунд

  logger.info('[ANALYZE-REF-POLL] 🔄 Mureka background polling started', {
    recognitionTaskId,
    descriptionTaskId,
    recognitionId: recognitionId.substring(0, 8),
    descriptionId: descriptionId.substring(0, 8),
    murekaFileId
  });

  let recognitionCompleted = false;
  let descriptionCompleted = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    logger.debug(`[ANALYZE-REF-POLL] Mureka attempt ${attempt}/${MAX_ATTEMPTS}`, {
      recognitionCompleted,
      descriptionCompleted
    });

    // ============================================================================
    // Poll Recognition Task
    // ============================================================================
    
    if (!recognitionCompleted) {
      try {
        // Mureka Recognition API возвращает результаты напрямую (нет polling endpoint)
        // Используем прямой вызов /v1/song/recognize снова
        const recogResult = await murekaClient.recognizeSong({
          upload_audio_id: murekaFileId
        });
        
        logger.debug('[ANALYZE-REF-POLL] Recognition result', { 
          taskId: recognitionTaskId,
          hasResult: !!recogResult.data.result
        });

        if (recogResult.data.result) {
          const result = recogResult.data.result;

          await supabaseAdmin
            .from('song_recognitions')
            .update({
              status: 'completed',
              recognized_title: result.title,
              recognized_artist: result.artist,
              recognized_album: result.album,
              release_date: result.release_date,
              confidence_score: result.confidence,
              external_ids: result.external_ids || {},
              metadata: {
                completed_at: new Date().toISOString(),
                mureka_result: result,
                provider: 'mureka'
              }
            })
            .eq('id', recognitionId);

          logger.info('[ANALYZE-REF-POLL] ✅ Mureka recognition completed', {
            recognitionId: recognitionId.substring(0, 8),
            title: result.title,
            artist: result.artist
          });

          recognitionCompleted = true;
        } else {
          // Задача еще обрабатывается
          logger.debug('[ANALYZE-REF-POLL] Recognition still processing');
        }
      } catch (error) {
        logger.error('[ANALYZE-REF-POLL] Recognition polling error', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Если ошибка - помечаем как failed
        if (attempt >= MAX_ATTEMPTS - 5) { // Начинаем фейлить за 5 попыток до конца
          await supabaseAdmin
            .from('song_recognitions')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Recognition failed'
            })
            .eq('id', recognitionId);
          recognitionCompleted = true;
        }
      }
    }

    // ============================================================================
    // Poll Description Task
    // ============================================================================
    
    if (!descriptionCompleted) {
      try {
        const descResult = await murekaClient.describeSong({
          url: audioUrl
        });
        
        logger.debug('[ANALYZE-REF-POLL] Description result', { 
          taskId: descriptionTaskId,
          hasDescription: !!descResult.data.description
        });

        if (descResult.data.description) {
          const desc = descResult.data.description;

          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'completed',
              ai_description: desc.text,
              detected_genre: desc.genre,
              detected_mood: desc.mood,
              detected_instruments: desc.instruments || [],
              tempo_bpm: desc.tempo_bpm,
              key_signature: desc.key,
              energy_level: desc.energy_level,
              danceability: desc.danceability,
              valence: desc.valence,
              metadata: {
                completed_at: new Date().toISOString(),
                mureka_description: desc,
                provider: 'mureka'
              }
            })
            .eq('id', descriptionId);

          logger.info('[ANALYZE-REF-POLL] ✅ Mureka description completed', {
            descriptionId: descriptionId.substring(0, 8),
            genre: desc.genre,
            mood: desc.mood
          });

          descriptionCompleted = true;
        } else {
          // Задача еще обрабатывается
          logger.debug('[ANALYZE-REF-POLL] Description still processing');
        }
      } catch (error) {
        logger.error('[ANALYZE-REF-POLL] Description polling error', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        // Если ошибка - помечаем как failed
        if (attempt >= MAX_ATTEMPTS - 5) {
          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'failed',
              error_message: error instanceof Error ? error.message : 'Description failed'
            })
            .eq('id', descriptionId);
          descriptionCompleted = true;
        }
      }
    }

    // ✅ Завершаем, если обе задачи готовы
    if (recognitionCompleted && descriptionCompleted) {
      logger.info('[ANALYZE-REF-POLL] 🎉 Both Mureka tasks completed', {
        recognitionId: recognitionId.substring(0, 8),
        descriptionId: descriptionId.substring(0, 8),
        attempts: attempt
      });
      return;
    }
  }

  // ⚠️ Timeout - обе задачи не завершились за MAX_ATTEMPTS
  logger.warn('[ANALYZE-REF-POLL] ⏰ Mureka polling timeout', {
    recognitionCompleted,
    descriptionCompleted,
    maxAttempts: MAX_ATTEMPTS
  });

  if (!recognitionCompleted) {
    await supabaseAdmin
      .from('song_recognitions')
      .update({
        status: 'failed',
        error_message: 'Polling timeout - Mureka task did not complete in time'
      })
      .eq('id', recognitionId);
  }

  if (!descriptionCompleted) {
    await supabaseAdmin
      .from('song_descriptions')
      .update({
        status: 'failed',
        error_message: 'Polling timeout - Mureka task did not complete in time'
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
