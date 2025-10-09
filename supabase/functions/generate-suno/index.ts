import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { v4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { downloadAndUploadAudio, downloadAndUploadCover, downloadAndUploadVideo } from "../_shared/storage.ts";
import { createSunoClient, SunoApiError, type SunoGenerationPayload } from "../_shared/suno.ts";

interface GenerateSunoRequestBody {
  trackId?: string;
  prompt?: string;
  tags?: string[];
  title?: string;
  make_instrumental?: boolean;
  model_version?: string;
  wait_audio?: boolean;
  idempotencyKey?: string;
  lyrics?: string;
  hasVocals?: boolean;
  customMode?: boolean;
}
import {
  createSupabaseAdminClient,
  createSupabaseUserClient,
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "../_shared/supabase.ts";
import { logger, withSentry } from "../_shared/logger.ts";
import { findOrCreateTrack } from "../_shared/track-helpers.ts";

export type PollSunoCompletionFn = (
  trackId: string,
  taskId: string,
  supabaseAdmin: any,
  apiKey: string,
  jobId: string | null,
) => Promise<void>;

export const mainHandler = async (req: Request): Promise<Response> => {
  const corsHeaders = {
    ...createCorsHeaders(req),
    ...createSecurityHeaders()
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let jobId: string | null = null;
  let supabaseAdmin: SupabaseClient | null = null;
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const normalisedSupabaseUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, "") : null;
  const callbackUrlEnv = Deno.env.get('SUNO_CALLBACK_URL')?.trim();
  const callbackUrl = callbackUrlEnv && callbackUrlEnv.length > 0
    ? callbackUrlEnv
    : normalisedSupabaseUrl
      ? `${normalisedSupabaseUrl}/functions/v1/suno-callback`
      : null;

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error('🔴 [GENERATE-SUNO] Supabase credentials are not configured');
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service role credentials are not configured');
    }

    supabaseAdmin = createSupabaseAdminClient();

    const body = (await req.json()) as GenerateSunoRequestBody;
    const hasLyricsInput = typeof body.lyrics === 'string';
    const trimmedLyrics = hasLyricsInput ? body.lyrics.trim() : '';
    const normalizedLyrics = hasLyricsInput
      ? (trimmedLyrics.length > 0 ? body.lyrics : null)
      : undefined;
    const hasVocalsInput = typeof body.hasVocals === 'boolean';
    const effectiveHasVocals = hasVocalsInput
      ? body.hasVocals
      : typeof body.make_instrumental === 'boolean'
        ? !body.make_instrumental
        : undefined;
    const customModeInput = typeof body.customMode === 'boolean' ? body.customMode : undefined;
    const customModeValue = customModeInput ?? (hasLyricsInput && trimmedLyrics.length > 0 ? true : undefined);
    const tagsProvided = Array.isArray(body.tags);
    const tags = tagsProvided ? body.tags! : [];
    const effectiveMakeInstrumental = typeof body.make_instrumental === 'boolean'
      ? body.make_instrumental
      : effectiveHasVocals === false;
    const effectiveWaitAudio = typeof body.wait_audio === 'boolean' ? body.wait_audio : false;

    const requestMetadata: Record<string, unknown> = {
      prompt: body.prompt ?? null,
      make_instrumental: effectiveMakeInstrumental ?? false,
      model_version: body.model_version || 'chirp-v3-5',
      wait_audio: effectiveWaitAudio,
    };

    if (tagsProvided) {
      requestMetadata.tags = tags;
    }

    if (effectiveHasVocals !== undefined) {
      requestMetadata.has_vocals = effectiveHasVocals;
    }
    if (customModeValue !== undefined) {
      requestMetadata.custom_mode = customModeValue;
    }
    if (normalizedLyrics !== undefined) {
      requestMetadata.lyrics = normalizedLyrics;
    }

    console.log('🎵 [GENERATE-SUNO] Request received:', JSON.stringify({
      trackId: body.trackId,
      title: body.title,
      prompt: body.prompt?.substring(0, 100),
      tags,
      make_instrumental: effectiveMakeInstrumental,
      model_version: body.model_version,
      wait_audio: effectiveWaitAudio,
      hasVocals: effectiveHasVocals,
      customMode: customModeValue,
      lyricsLength: hasLyricsInput ? body.lyrics.length : 0,
      idempotencyKey: body.idempotencyKey,
      timestamp: new Date().toISOString()
    }, null, 2));

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseUserClient(token);

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      logger.error('🔴 [GENERATE-SUNO] Auth failed', { error: authError ?? undefined });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ [GENERATE-SUNO] User authenticated:', user.id);

    const trackId = body.trackId;
    const prompt = body.prompt;
    const title = body.title;
    const modelVersion = body.model_version;
    const idempotencyKey = body.idempotencyKey || crypto.randomUUID();

    const { data: existingJob } = await supabaseAdmin
      .from('ai_jobs')
      .select('id, external_id')
      .eq('idempotency_key', idempotencyKey)
      .single();

    if (existingJob) {
      console.log('✅ [GENERATE-SUNO] Idempotent request detected. Returning existing job:', existingJob.id);
      return new Response(JSON.stringify({ jobId: existingJob.id, externalId: existingJob.external_id, message: "Request already processed." }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: job, error: jobError } = await supabaseAdmin
      .from('ai_jobs')
      .insert({ user_id: user.id, prompt, status: 'pending', idempotency_key: idempotencyKey })
      .select()
      .single();

    if (jobError) {
      logger.error('🔴 [GENERATE-SUNO] Error creating job record', { error: jobError });
      throw jobError;
    }
    jobId = job.id;
    console.log('✅ [GENERATE-SUNO] Created new job record:', jobId);

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      logger.error('🔴 [GENERATE-SUNO] SUNO_API_KEY not configured');
      throw new Error('SUNO_API_KEY not configured');
    }

    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });
    console.log('✅ [GENERATE-SUNO] API key configured');

    const finalTrackId = await findOrCreateTrack(supabaseAdmin, user.id, {
      trackId,
      title,
      prompt,
      lyrics: normalizedLyrics,
      hasVocals: effectiveHasVocals,
      styleTags: tags,
      requestMetadata,
    });

    console.log(' [GENERATE-SUNO] Starting Suno generation for track:', finalTrackId);

    const { data: existingTrack, error: loadErr } = await supabaseAdmin
      .from('tracks')
      .select('metadata,status,lyrics,has_vocals,style_tags')
      .eq('id', finalTrackId)
      .maybeSingle();
    if (loadErr) {
      logger.error('🔴 [GENERATE-SUNO] Error loading track for resume', { error: loadErr });
    }

    const existingTaskId = existingTrack?.metadata?.suno_task_id;
    if (existingTaskId && existingTrack?.status === 'processing') {
      console.log('♻️ [GENERATE-SUNO] Resuming existing Suno task:', existingTaskId);
      pollSunoCompletion(finalTrackId, existingTaskId, supabaseAdmin, SUNO_API_KEY, jobId).catch(err => {
        logger.error('🔴 [GENERATE-SUNO] Resume polling error', { error: err instanceof Error ? err : new Error(String(err)) });
      });
      return new Response(JSON.stringify({ success: true, trackId: finalTrackId, taskId: existingTaskId, message: 'Resumed polling for existing task' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const sunoPayload: SunoGenerationPayload = {
      prompt,
      tags,
      title: title || 'Generated Track',
      make_instrumental: effectiveMakeInstrumental ?? false,
      model_version: modelVersion || 'chirp-v3-5',
      wait_audio: effectiveWaitAudio,
      callBackUrl: callbackUrl ?? undefined,
      ...(typeof normalizedLyrics === 'string' ? { lyrics: normalizedLyrics } : {}),
      ...(effectiveHasVocals !== undefined ? { has_vocals: effectiveHasVocals } : {}),
      ...(customModeValue !== undefined ? { custom_mode: customModeValue } : {}),
    };
    console.log('📤 [GENERATE-SUNO] Sending request to Suno API:', JSON.stringify(sunoPayload, null, 2));

    const generationResult = await sunoClient.generateTrack(sunoPayload);
    console.log('📥 [GENERATE-SUNO] Suno API response:', JSON.stringify(generationResult.rawResponse, null, 2));

    const taskId = generationResult.taskId;
    await supabaseAdmin.from('ai_jobs').update({ external_id: taskId, status: 'processing' }).eq('id', jobId);
    const existingMetadata = existingTrack?.metadata && typeof existingTrack.metadata === 'object' && !Array.isArray(existingTrack.metadata)
      ? { ...(existingTrack.metadata as Record<string, unknown>) }
      : {};

    const updatedMetadata: Record<string, unknown> = {
      ...existingMetadata,
      ...requestMetadata,
      suno_task_id: taskId,
      suno_response: generationResult.rawResponse,
      job_id: jobId,
      suno_generate_endpoint: generationResult.endpoint,
      ...(generationResult.jobId ? { suno_job_id: generationResult.jobId } : {}),
      suno_completion_strategy: callbackUrl ? 'callback' : 'polling',
      suno_callback_url: callbackUrl ?? null,
    };

    const trackUpdateAfterGeneration: Record<string, unknown> = {
      status: 'processing',
      metadata: updatedMetadata,
    };

    if (normalizedLyrics !== undefined) {
      trackUpdateAfterGeneration.lyrics = normalizedLyrics;
    }
    if (effectiveHasVocals !== undefined) {
      trackUpdateAfterGeneration.has_vocals = effectiveHasVocals;
    }
    if (tagsProvided) {
      trackUpdateAfterGeneration.style_tags = tags;
    }

    const { error: updateError } = await supabaseAdmin
      .from('tracks')
      .update(trackUpdateAfterGeneration)
      .eq('id', finalTrackId);

    if (updateError) {
      logger.error('🔴 [GENERATE-SUNO] Error updating track', { error: updateError });
      throw updateError;
    }

    if (callbackUrl) {
      console.log('✅ [GENERATE-SUNO] Callback URL registered:', callbackUrl);
      console.log('⏳ [GENERATE-SUNO] Waiting for Suno callback to finalize track');
      // Schedule a defensive fallback poll in case the callback never arrives
      try {
        const adminForFallback = supabaseAdmin;
        if (adminForFallback) {
          setTimeout(() => {
            console.log('⏱️ [GENERATE-SUNO] Callback fallback poll triggered');
            pollSunoCompletion(finalTrackId, taskId, adminForFallback, SUNO_API_KEY, jobId).catch(err => {
              logger.error('🔴 [GENERATE-SUNO] Fallback polling error', { error: err instanceof Error ? err : new Error(String(err)) });
            });
          }, 3 * 60 * 1000); // 3 minutes
        } else {
          logger.error('🔴 [GENERATE-SUNO] Supabase admin client unavailable for fallback polling');
        }
      } catch (timeoutError) {
        logger.error('🔴 [GENERATE-SUNO] Failed to schedule fallback poll', { error: timeoutError instanceof Error ? timeoutError : new Error(String(timeoutError)) });
      }
    } else {
      console.log('⚠️ [GENERATE-SUNO] Callback URL unavailable, falling back to polling');
      pollSunoCompletion(finalTrackId, taskId, supabaseAdmin, SUNO_API_KEY, jobId).catch(err => {
        logger.error('🔴 [GENERATE-SUNO] Polling error', { error: err instanceof Error ? err : new Error(String(err)) });
      });
    }

    console.log('✅ [GENERATE-SUNO] Generation started successfully');
    return new Response(JSON.stringify({ success: true, trackId: finalTrackId, taskId: taskId, message: 'Generation started, polling for completion' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logger.error('🔴 [GENERATE-SUNO] Error in generate-suno function', { error: error instanceof Error ? error : new Error(String(error)) });
    logger.error('🔴 [GENERATE-SUNO] Error stack', { stack: error instanceof Error ? error.stack : 'No stack trace' });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (jobId && supabaseAdmin) {
      await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: errorMessage }).eq('id', jobId);
    }

    let status = 500;
    let message = 'Internal server error';
    let details: unknown = errorMessage;

    if (error instanceof SunoApiError) {
      const detailStatus = error.details.status ?? 0;
      if (detailStatus) {
        status = detailStatus === 0 ? 502 : detailStatus;
      }
      if (status === 401) {
        message = 'Требуется авторизация к Suno API';
      } else if (status === 402) {
        message = 'Недостаточно средств на балансе Suno API';
      } else if (status === 404) {
        message = 'Запрос Suno API не найден';
      } else if (status === 429) {
        message = 'Превышен лимит Suno API. Попробуйте позже';
      } else if (status >= 500) {
        message = 'Suno API временно недоступен';
      } else {
        message = error.message;
      }
      details = {
        endpoint: error.details.endpoint,
        status: error.details.status ?? null,
        body: error.details.body ?? null,
      };
    } else if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Authorization')) {
        status = 401;
        message = 'Требуется авторизация';
      } else if (error.message.includes('Payment') || error.message.includes('402')) {
        status = 402;
        message = 'Недостаточно средств на балансе Suno API';
      } else if (error.message.includes('Rate limit') || error.message.includes('429')) {
        status = 429;
        message = 'Превышен лимит запросов. Попробуйте позже';
      } else if (error.message.includes('not found') || error.message.includes('404')) {
        status = 404;
        message = 'Трек не найден';
      } else {
        message = error.message;
      }
    }

    return new Response(JSON.stringify({ error: message, details }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status,
    });
  }
}

/**
 * Опрашивает Suno API для проверки статуса генерации и сохраняет результаты
 *
 * ВАЖНО: Suno API возвращает массив из 2 треков на каждый запрос
 * - Первый трек (tasks[0]) → обновляется в таблице `tracks`
 * - Второй трек (tasks[1]) → сохраняется в таблицу `track_versions`
 */
const defaultPollSunoCompletion: PollSunoCompletionFn = async (
  trackId,
  taskId,
  supabaseAdmin,
  apiKey,
  jobId,
) => {
  const sunoClient = createSunoClient({ apiKey });
  const maxAttempts = 60; // Максимум 60 попыток = 5 минут (интервал 5 секунд)
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;

    try {
      console.log(`Polling Suno task ${taskId}, attempt ${attempts}`);

      const queryResult = await sunoClient.queryTask(taskId);

      if (attempts <= 3) {
        console.log(`[Attempt ${attempts}] Suno poll response (${queryResult.endpoint}):`, JSON.stringify(queryResult.rawResponse, null, 2));
      }

      if (typeof queryResult.code === 'number' && queryResult.code !== 200) {
        logger.error('Unexpected Suno poll code', { code: queryResult.code });
        continue;
      }

      const tasks = queryResult.tasks;
      
      // ДИАГНОСТИКА: Детальное логирование всех треков
      console.log(`📊 [DIAGNOSTIC] Total tasks returned: ${tasks.length}`);
      const statusesLog = tasks.map((t: any, idx: number) => ({
        index: idx,
        id: t.id || t.taskId,
        status: t.status,
        hasAudio: Boolean(t.audioUrl || t.audio_url || t.stream_audio_url || t.source_stream_audio_url),
        audioUrl: (t.audioUrl || t.audio_url || t.stream_audio_url || t.source_stream_audio_url)?.substring(0, 60),
        hasCover: Boolean(t.image_url || t.image_large_url || t.imageUrl),
        hasVideo: Boolean(t.video_url || t.videoUrl),
        title: t.title,
        model: t.model || t.model_name
      }));
      console.log('🔍 [DIAGNOSTIC] Suno poll statuses:', JSON.stringify(statusesLog, null, 2));
      
      // Check if all tasks are complete
      const allComplete = tasks.every((t: any) => t.status === 'success' || t.status === 'complete');
      const anyFailed = tasks.some((t: any) => t.status === 'error' || t.status === 'failed');

      if (anyFailed) {
        const firstErr = tasks.find((t: any) => t.status === 'error' || t.status === 'failed');
        const reason = firstErr?.msg || firstErr?.error || 'Generation failed';
        await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: reason }).eq('id', trackId);
        if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: reason }).eq('id', jobId);
        console.log('Track generation failed:', trackId, reason);
        return;
      }

      if (allComplete && tasks.length > 0) {
        console.log(`🎉 [COMPLETION] All ${tasks.length} tracks completed. Processing...`);
        
        /**
         * КРИТИЧЕСКОЕ ИЗМЕНЕНИЕ: Обработка ВСЕХ треков из ответа Suno
         * 
         * Suno API возвращает массив tasks[], обычно с 2 треками:
         * - tasks[0] - Первая версия (основной трек)
         * - tasks[1] - Вторая версия (альтернативная версия)
         * 
         * Стратегия сохранения:
         * 1. Первый трек → обновляем запись в таблице `tracks` (основной трек)
         * 2. Остальные треки → создаем записи в таблице `track_versions`
         * 3. Первый трек автоматически становится мастер-версией
         */
        
        // Фильтруем только успешные треки с аудио
        const successfulTracks = tasks.filter((t: any) =>
          t.audioUrl || t.audio_url || t.stream_audio_url || t.source_stream_audio_url
        );

        if (successfulTracks.length === 0) {
          await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: 'Completed without audio URL in response' }).eq('id', trackId);
          if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: 'Completed without audio URL' }).eq('id', jobId);
          logger.error('🔴 [COMPLETION] No tracks with audio URL', { trackId });
          return;
        }
        
        console.log(`✅ [COMPLETION] Found ${successfulTracks.length} successful tracks with audio`);
        
        // ДИАГНОСТИКА: Логируем детали всех успешных треков
        successfulTracks.forEach((track: any, idx: number) => {
          console.log(`📋 [TRACK ${idx}] Details:`, {
            id: track.id,
            title: track.title,
            status: track.status,
            audioUrl: (track.audioUrl || track.audio_url)?.substring(0, 60) + '...',
            hasLyrics: Boolean(track.lyric || track.lyrics),
            duration: track.duration || track.duration_seconds
          });
        });
        
        // ========================================
        // ШАГ 1: Обработка первого трека (основной)
        // ========================================
        const mainTrack = successfulTracks[0];
        
        // Извлекаем метаданные из первого трека
        const externalAudioUrl = mainTrack.audioUrl || mainTrack.audio_url || 
                                mainTrack.stream_audio_url || mainTrack.source_stream_audio_url;
        const duration = mainTrack.duration || mainTrack.duration_seconds || 0;
        const actualLyrics = mainTrack.lyric || mainTrack.lyrics || mainTrack.prompt;
        const externalCoverUrl = mainTrack.image_url || mainTrack.image_large_url || mainTrack.imageUrl;
        const externalVideoUrl = mainTrack.video_url || mainTrack.videoUrl;
        const sunoId = mainTrack.id;
        const modelName = mainTrack.model || mainTrack.model_name;
        const createdAtSuno = mainTrack.created_at || mainTrack.createdAt;
        
        const { data: trackData } = await supabaseAdmin.from('tracks').select('user_id, metadata').eq('id', trackId).single();
        const userId = trackData?.user_id;
        if (!userId) {
          throw new Error('User ID not found for track');
        }

        const existingMetadata = (trackData?.metadata && typeof trackData.metadata === 'object') ? trackData.metadata as Record<string, unknown> : {};

        console.log('📦 [STORAGE] Starting file uploads to Supabase Storage...');
        if (!externalAudioUrl) {
          throw new Error('Missing audio URL from Suno API');
        }
        const audioUrl = await downloadAndUploadAudio(externalAudioUrl, trackId, userId, 'main.mp3', supabaseAdmin);
        let coverUrl = externalCoverUrl;
        if (externalCoverUrl) {
          coverUrl = await downloadAndUploadCover(externalCoverUrl, trackId, userId, 'cover.jpg', supabaseAdmin);
        }
        let videoUrl = externalVideoUrl;
        if (externalVideoUrl) {
          videoUrl = await downloadAndUploadVideo(externalVideoUrl, trackId, userId, 'video.mp4', supabaseAdmin);
        }

        console.log('📦 [MAIN TRACK] Metadata extracted:', {
          audioUrl: audioUrl?.substring(0, 50) + '...',
          coverUrl: coverUrl?.substring(0, 50) + '...',
          videoUrl: videoUrl?.substring(0, 50) + '...',
          sunoId,
          modelName,
          duration: `${Math.round(duration)}s`,
          hasLyrics: Boolean(actualLyrics)
        });

        const pollMetadata = {
          ...existingMetadata,
          suno_data: tasks,
          suno_last_poll_endpoint: queryResult.endpoint,
          suno_last_poll_code: queryResult.code ?? null,
          suno_last_poll_at: new Date().toISOString(),
          suno_poll_snapshot: queryResult.rawResponse,
        };

        const { error: updateMainError } = await supabaseAdmin.from('tracks').update({
          status: 'completed',
          audio_url: audioUrl,
          duration: Math.round(duration),
          duration_seconds: Math.round(duration),
          lyrics: actualLyrics,
          cover_url: coverUrl,
          video_url: videoUrl,
          suno_id: sunoId,
          model_name: modelName,
          created_at_suno: createdAtSuno,
          metadata: pollMetadata,
        }).eq('id', trackId);

        if (updateMainError) {
          logger.error('🔴 [MAIN TRACK] Failed to update', { error: updateMainError });
          if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: updateMainError.message }).eq('id', jobId);
          throw updateMainError;
        }

        console.log(`✅ [MAIN TRACK] Successfully updated track ${trackId}`);

        // ========================================
        // ШАГ 2: Обработка остальных треков (версии)
        // ========================================
        if (successfulTracks.length > 1) {
          console.log(`🎵 [VERSIONS] Processing ${successfulTracks.length - 1} additional version(s)...`);
          
          // Проходим по всем трекам начиная со второго (индекс 1)
          for (let i = 1; i < successfulTracks.length; i++) {
            const versionTrack = successfulTracks[i];
            
            // Извлекаем метаданные для версии
            const externalVersionAudioUrl = versionTrack.audioUrl || versionTrack.audio_url || 
                                           versionTrack.stream_audio_url || versionTrack.source_stream_audio_url;
            const versionDuration = versionTrack.duration || versionTrack.duration_seconds || 0;
            const versionLyrics = versionTrack.lyric || versionTrack.lyrics || versionTrack.prompt;
            const externalVersionCoverUrl = versionTrack.image_url || versionTrack.image_large_url || versionTrack.imageUrl;
            const externalVersionVideoUrl = versionTrack.video_url || versionTrack.videoUrl;
            const versionSunoId = versionTrack.id;
            
            console.log(`📦 [VERSION ${i}] Uploading to Storage...`);
            if (!externalVersionAudioUrl) {
              logger.warn(`Missing audio URL for version ${i}`, { trackId, versionIndex: i });
              continue;
            }
            const versionAudioUrl = await downloadAndUploadAudio(externalVersionAudioUrl, trackId, userId, `version-${i}.mp3`, supabaseAdmin);
            let versionCoverUrl = externalVersionCoverUrl;
            if (externalVersionCoverUrl) {
              versionCoverUrl = await downloadAndUploadCover(externalVersionCoverUrl, trackId, userId, `version-${i}-cover.jpg`, supabaseAdmin);
            }
            let versionVideoUrl = externalVersionVideoUrl;
            if (externalVersionVideoUrl) {
              versionVideoUrl = await downloadAndUploadVideo(externalVersionVideoUrl, trackId, userId, `version-${i}-video.mp4`, supabaseAdmin);
            }
            
            console.log(`📦 [VERSION ${i}] Metadata extracted:`, {
              audioUrl: versionAudioUrl?.substring(0, 50) + '...',
              coverUrl: versionCoverUrl?.substring(0, 50) + '...',
              sunoId: versionSunoId,
              duration: `${Math.round(versionDuration)}s`
            });
            
            const versionData = {
              parent_track_id: trackId,
              version_number: i,
              is_master: false,
              audio_url: versionAudioUrl,
              cover_url: versionCoverUrl,
              video_url: versionVideoUrl,
              duration: Math.round(versionDuration),
              lyrics: versionLyrics,
              suno_id: versionSunoId,
              metadata: {
                suno_track_data: versionTrack,
                created_from_generation: true,
                generation_task_id: taskId,
                suno_last_poll_endpoint: queryResult.endpoint,
              }
            };
            
            console.log(`📝 [VERSION ${i}] Attempting to insert version data:`, {
              parent_track_id: trackId,
              version_number: i,
              has_audio: Boolean(versionAudioUrl),
              has_cover: Boolean(versionCoverUrl),
              suno_id: versionSunoId
            });
            
            const { error: insertVersionError } = await supabaseAdmin.from('track_versions').insert(versionData);
            
            if (insertVersionError) {
              logger.error(`🔴 [VERSION ${i}] Failed to insert`, { 
                error: insertVersionError,
                code: insertVersionError.code,
                message: insertVersionError.message,
                details: insertVersionError.details,
                hint: insertVersionError.hint
              });
              console.error(`🔴 [VERSION ${i}] Database error details:`, {
                errorCode: insertVersionError.code,
                errorMessage: insertVersionError.message,
                parentTrackId: trackId,
                versionNumber: i
              });
            } else {
              console.log(`✅ [VERSION ${i}] Successfully created version for track ${trackId}`);
            }
          }
          console.log(`✅ [VERSIONS] All versions processed successfully`);
        } else {
          console.log('ℹ️ [VERSIONS] Only 1 track returned, no versions to create');
        }

        if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'completed' }).eq('id', jobId);
        console.log(`✅ [COMPLETION] Track ${trackId} completed with ${successfulTracks.length} version(s)`);
        return;
      }

    } catch (error) {
      logger.error('Polling iteration error', { error: error instanceof Error ? error : new Error(String(error)) });

      if (error instanceof SunoApiError) {
        const status = error.details.status ?? 0;
        if (status === 0 || status === 200 || status === 202 || status === 429 || status >= 500) {
          console.log('Retryable Suno polling error, continuing...');
          continue;
        }
        const reason = error.message || 'Suno polling error';
        await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: reason }).eq('id', trackId);
        if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: reason }).eq('id', jobId);
        return;
      }

      const message = error instanceof Error ? error.message : 'Unknown polling error';
      if (jobId) {
        await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: message }).eq('id', jobId);
      }
      await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: message }).eq('id', trackId);
      return;
    }
  }

  await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: 'Generation timeout' }).eq('id', trackId);
  if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: 'Generation timeout' }).eq('id', jobId);
  console.log('Track generation timeout:', trackId);
};

let pollSunoCompletionImpl: PollSunoCompletionFn = defaultPollSunoCompletion;

const pollSunoCompletion: PollSunoCompletionFn = async (
  trackId,
  taskId,
  supabaseAdmin,
  apiKey,
  jobId,
) => pollSunoCompletionImpl(trackId, taskId, supabaseAdmin, apiKey, jobId);

export const setPollSunoCompletionOverride = (override?: PollSunoCompletionFn) => {
  pollSunoCompletionImpl = override ?? defaultPollSunoCompletion;
};

// Применяем rate limiting middleware и обёртку Sentry
const rateLimitedHandler = withRateLimit(mainHandler, {
  maxRequests: 10,
  windowMinutes: 1, // 1 minute
  endpoint: 'generate-suno'
});

export const handler = withSentry(rateLimitedHandler, { transaction: 'generate-suno' });

if (import.meta.main) {
  serve(handler);
}
