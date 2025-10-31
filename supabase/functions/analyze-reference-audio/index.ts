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
import { createFalClient, FalApiError } from "../_shared/fal.ts";
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

    // ============================================================================
    // 🔒 Валидация формата аудио (Mureka поддерживает только MP3 и M4A)
    // ============================================================================
    
    const supportedFormats = ['mp3', 'm4a'];
    const urlLower = audioUrl.toLowerCase();
    const hasValidExtension = supportedFormats.some(fmt => 
      urlLower.includes(`.${fmt}`) || urlLower.includes(`/${fmt}/`)
    );
    
    if (!hasValidExtension) {
      logger.warn('[ANALYZE-REF] ❌ Unsupported audio format', { audioUrl: audioUrl.substring(0, 100) });
      return new Response(
        JSON.stringify({ 
          error: 'Unsupported audio format. Mureka API supports only MP3 and M4A files.',
          supportedFormats: supportedFormats
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('[ANALYZE-REF] ✅ Audio format validated', { urlSample: audioUrl.substring(0, 100) });

    // ✅ Check Fal.AI API key
    const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
    if (!FAL_API_KEY) {
      throw new Error('FAL_API_KEY not configured');
    }

    const falClient = createFalClient({ apiKey: FAL_API_KEY });
    const supabaseAdmin = createSupabaseAdminClient();

    // ============================================================================
    // STEP 1: Validate audio URL format
    // ============================================================================
    
    logger.info('[ANALYZE-REF] 🎵 Starting Fal.AI audio analysis', { 
      url: audioUrl.substring(0, 100) 
    });

    // Fal.AI работает напрямую с URL - валидация формата не требуется

    // ============================================================================
    // STEP 2: Запуск Song Recognition через Fal.AI
    // ============================================================================

    logger.info('[ANALYZE-REF] 🔍 Starting Fal.AI song recognition');
    
    const recognitionPrompt = `Analyze this audio and extract the following information in a structured format:
    
SONG METADATA:
- Title: [song title]
- Artist: [artist name]
- Album: [album name if identifiable]
- Release Date: [year or full date if known]

MUSIC CHARACTERISTICS:
- Genre: [primary genre]
- Mood: [overall mood/vibe]
- Tempo BPM: [estimated beats per minute]
- Key Signature: [musical key if identifiable]
- Instruments: [list of prominent instruments]

AUDIO QUALITY:
- Confidence: [how confident you are in the identification, 0-1 scale]

Format the response clearly with each field on a new line.`;

    const recognitionTask = await falClient.startAnalysis({
      audio_url: audioUrl,
      prompt: recognitionPrompt,
      detailed_analysis: true
    });

    logger.info('[ANALYZE-REF] ✅ Fal.AI recognition task created', { 
      requestId: recognitionTask.request_id,
      status: recognitionTask.status
    });

    // ============================================================================
    // STEP 3: Запуск Song Description через Fal.AI (параллельно)
    // ============================================================================

    logger.info('[ANALYZE-REF] 📖 Starting Fal.AI song description');
    
    const descriptionPrompt = `Analyze this audio track and provide detailed information:

MUSICAL ANALYSIS:
- Genre: [specific genre classification]
- Mood: [emotional mood/atmosphere]
- Tempo BPM: [estimated beats per minute as number]
- Key Signature: [musical key]

INSTRUMENTATION:
- Instruments: [list all identifiable instruments]

AUDIO CHARACTERISTICS:
- Energy Level: [1-10 scale]
- Danceability: [1-10 scale] 
- Valence: [1-10 scale, emotional positivity]

Provide all details in a clear, structured format.`;

    const descriptionTask = await falClient.startAnalysis({
      audio_url: audioUrl,
      prompt: descriptionPrompt,
      detailed_analysis: true
    });

    logger.info('[ANALYZE-REF] ✅ Both Fal.AI tasks initiated', {
      recognitionRequestId: recognitionTask.request_id,
      descriptionRequestId: descriptionTask.request_id
    });

    // ============================================================================
    // STEP 4: Создание записей в БД (с Fal.AI request_id)
    // ============================================================================

    // 4.1 Create song_recognitions record
    const { data: recognitionRecord, error: recognitionError } = await supabaseAdmin
      .from('song_recognitions')
      .insert({
        user_id: userId,
        audio_file_url: audioUrl,
        fal_request_id: recognitionTask.request_id,
        provider: 'fal',
        status: 'processing',
        metadata: {
          fal_status: recognitionTask.status,
          queue_position: recognitionTask.queue_position,
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
        fal_request_id: descriptionTask.request_id,
        provider: 'fal',
        status: 'processing',
        metadata: {
          fal_status: descriptionTask.status,
          queue_position: descriptionTask.queue_position,
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
    // STEP 5: Background polling для обеих Fal.AI задач
    // ============================================================================

    // ✅ Используем Promise без await для background execution
    pollFalAnalysis(
      recognitionTask.request_id,
      descriptionTask.request_id,
      recognitionRecord.id,
      descriptionRecord.id
    ).catch((error) => {
      logger.error('[ANALYZE-REF] Background polling error', { 
        error: error instanceof Error ? error.message : String(error) 
      });
    });

    logger.info('[ANALYZE-REF] 🚀 Fal.AI background polling started');

    // ============================================================================
    // STEP 6: Return response
    // ============================================================================

    const response: AnalyzeReferenceAudioResponse = {
      success: true,
      recognitionId: recognitionRecord.id,
      descriptionId: descriptionRecord.id,
      uploadedFileId: recognitionTask.request_id, // Используем Fal request_id
      analysis: undefined
    };

    logger.info('[ANALYZE-REF] ✨ Request completed (Fal.AI)', {
      recognitionId: recognitionRecord.id,
      descriptionId: descriptionRecord.id,
      recognitionRequestId: recognitionTask.request_id,
      descriptionRequestId: descriptionTask.request_id
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

    if (error instanceof FalApiError) {
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
// BACKGROUND POLLING FUNCTION (Fal.AI)
// ============================================================================

/**
 * Парсит AI-ответ Fal.AI в структурированные данные
 */
function parseFalOutput(output: string): { recognition?: any; description?: any } {
  const result: { recognition?: any; description?: any } = {};
  
  // Парсинг recognition данных
  const titleMatch = output.match(/Title:\s*(.+)/i);
  const artistMatch = output.match(/Artist:\s*(.+)/i);
  const albumMatch = output.match(/Album:\s*(.+)/i);
  const releaseDateMatch = output.match(/Release Date:\s*(.+)/i);
  const confidenceMatch = output.match(/Confidence:\s*([\d.]+)/i);
  
  if (titleMatch || artistMatch) {
    result.recognition = {
      title: titleMatch?.[1]?.trim() || 'Unknown',
      artist: artistMatch?.[1]?.trim() || 'Unknown',
      album: albumMatch?.[1]?.trim(),
      release_date: releaseDateMatch?.[1]?.trim(),
      confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.5
    };
  }
  
  // Парсинг description данных
  const genreMatch = output.match(/Genre:\s*(.+)/i);
  const moodMatch = output.match(/Mood:\s*(.+)/i);
  const tempoMatch = output.match(/Tempo BPM:\s*(\d+)/i);
  const keyMatch = output.match(/Key Signature:\s*(.+)/i);
  const instrumentsMatch = output.match(/Instruments:\s*(.+)/i);
  const energyMatch = output.match(/Energy Level:\s*(\d+)/i);
  const danceMatch = output.match(/Danceability:\s*(\d+)/i);
  const valenceMatch = output.match(/Valence:\s*(\d+)/i);
  
  if (genreMatch || moodMatch) {
    result.description = {
      text: output,
      genre: genreMatch?.[1]?.trim(),
      mood: moodMatch?.[1]?.trim(),
      tempo_bpm: tempoMatch ? parseInt(tempoMatch[1]) : undefined,
      key: keyMatch?.[1]?.trim(),
      instruments: instrumentsMatch?.[1]?.split(',').map(i => i.trim()) || [],
      energy_level: energyMatch ? parseInt(energyMatch[1]) : undefined,
      danceability: danceMatch ? parseInt(danceMatch[1]) : undefined,
      valence: valenceMatch ? parseInt(valenceMatch[1]) : undefined
    };
  }
  
  return result;
}

/**
 * Опрашивает Fal.AI API для получения результатов обеих задач
 * Обновляет записи в БД по мере готовности результатов
 */
async function pollFalAnalysis(
  recognitionRequestId: string,
  descriptionRequestId: string,
  recognitionId: string,
  descriptionId: string
): Promise<void> {
  const FAL_API_KEY = Deno.env.get('FAL_API_KEY');
  if (!FAL_API_KEY) {
    logger.error('[ANALYZE-REF-POLL] FAL_API_KEY not configured');
    return;
  }

  const falClient = createFalClient({ apiKey: FAL_API_KEY });
  const supabaseAdmin = createSupabaseAdminClient();

  const MAX_ATTEMPTS = 60; // 60 * 5s = 5 минут максимум
  const POLL_INTERVAL_MS = 5000; // 5 секунд

  logger.info('[ANALYZE-REF-POLL] 🔄 Fal.AI background polling started', {
    recognitionRequestId,
    descriptionRequestId,
    recognitionId: recognitionId.substring(0, 8),
    descriptionId: descriptionId.substring(0, 8)
  });

  let recognitionCompleted = false;
  let descriptionCompleted = false;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));

    logger.debug(`[ANALYZE-REF-POLL] Fal.AI attempt ${attempt}/${MAX_ATTEMPTS}`, {
      recognitionCompleted,
      descriptionCompleted
    });

    // ============================================================================
    // Poll Recognition Task
    // ============================================================================
    
    if (!recognitionCompleted) {
      try {
        const recogStatus = await falClient.checkStatus(recognitionRequestId, true);
        
        logger.debug('[ANALYZE-REF-POLL] Recognition status', { 
          requestId: recognitionRequestId,
          status: recogStatus.status,
          queuePosition: recogStatus.queue_position
        });

        if (recogStatus.status === 'COMPLETED') {
          const result = await falClient.getResult(recognitionRequestId);
          const parsed = parseFalOutput(result.output);

          if (parsed.recognition) {
            await supabaseAdmin
              .from('song_recognitions')
              .update({
                status: 'completed',
                recognized_title: parsed.recognition.title,
                recognized_artist: parsed.recognition.artist,
                recognized_album: parsed.recognition.album,
                release_date: parsed.recognition.release_date,
                confidence_score: parsed.recognition.confidence,
                metadata: {
                  completed_at: new Date().toISOString(),
                  fal_output: result.output,
                  provider: 'fal'
                }
              })
              .eq('id', recognitionId);

            logger.info('[ANALYZE-REF-POLL] ✅ Fal.AI recognition completed', {
              recognitionId: recognitionId.substring(0, 8),
              title: parsed.recognition.title,
              artist: parsed.recognition.artist
            });

            recognitionCompleted = true;
          } else {
            logger.warn('[ANALYZE-REF-POLL] ⚠️ Could not parse recognition from Fal.AI output');
            await supabaseAdmin
              .from('song_recognitions')
              .update({
                status: 'failed',
                error_message: 'Failed to parse AI output',
                metadata: { fal_output: result.output }
              })
              .eq('id', recognitionId);
            recognitionCompleted = true;
          }
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
        const descStatus = await falClient.checkStatus(descriptionRequestId, true);
        
        logger.debug('[ANALYZE-REF-POLL] Description status', { 
          requestId: descriptionRequestId,
          status: descStatus.status,
          queuePosition: descStatus.queue_position
        });

        if (descStatus.status === 'COMPLETED') {
          const result = await falClient.getResult(descriptionRequestId);
          const parsed = parseFalOutput(result.output);

          if (parsed.description) {
            await supabaseAdmin
              .from('song_descriptions')
              .update({
                status: 'completed',
                ai_description: parsed.description.text,
                detected_genre: parsed.description.genre,
                detected_mood: parsed.description.mood,
                detected_instruments: parsed.description.instruments,
                tempo_bpm: parsed.description.tempo_bpm,
                key_signature: parsed.description.key,
                energy_level: parsed.description.energy_level,
                danceability: parsed.description.danceability,
                valence: parsed.description.valence,
                metadata: {
                  completed_at: new Date().toISOString(),
                  fal_output: result.output,
                  provider: 'fal'
                }
              })
              .eq('id', descriptionId);

            logger.info('[ANALYZE-REF-POLL] ✅ Fal.AI description completed', {
              descriptionId: descriptionId.substring(0, 8),
              genre: parsed.description.genre,
              mood: parsed.description.mood
            });

            descriptionCompleted = true;
          } else {
            logger.warn('[ANALYZE-REF-POLL] ⚠️ Could not parse description from Fal.AI output');
            await supabaseAdmin
              .from('song_descriptions')
              .update({
                status: 'failed',
                error_message: 'Failed to parse AI output',
                metadata: { fal_output: result.output }
              })
              .eq('id', descriptionId);
            descriptionCompleted = true;
          }
        }
      } catch (error) {
        logger.error('[ANALYZE-REF-POLL] Description polling error', { 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    }

    // ✅ Завершаем, если обе задачи готовы
    if (recognitionCompleted && descriptionCompleted) {
      logger.info('[ANALYZE-REF-POLL] 🎉 Both Fal.AI tasks completed', {
        recognitionId: recognitionId.substring(0, 8),
        descriptionId: descriptionId.substring(0, 8),
        attempts: attempt
      });
      return;
    }
  }

  // ⚠️ Timeout - обе задачи не завершились за MAX_ATTEMPTS
  logger.warn('[ANALYZE-REF-POLL] ⏰ Fal.AI polling timeout', {
    recognitionCompleted,
    descriptionCompleted,
    maxAttempts: MAX_ATTEMPTS
  });

  if (!recognitionCompleted) {
    await supabaseAdmin
      .from('song_recognitions')
      .update({
        status: 'failed',
        error_message: 'Polling timeout - Fal.AI task did not complete in time'
      })
      .eq('id', recognitionId);
  }

  if (!descriptionCompleted) {
    await supabaseAdmin
      .from('song_descriptions')
      .update({
        status: 'failed',
        error_message: 'Polling timeout - Fal.AI task did not complete in time'
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
