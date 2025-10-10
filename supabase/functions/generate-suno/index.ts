import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { v4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { downloadAndUploadAudio, downloadAndUploadCover, downloadAndUploadVideo } from "../_shared/storage.ts";
import { createSunoClient, SunoApiError, type SunoGenerationPayload } from "../_shared/suno.ts";
import { fetchSunoBalance } from "../_shared/suno-balance.ts";

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
    const hasLyricsInput = typeof body.lyrics === 'string' && body.lyrics !== null;
    const trimmedLyrics = hasLyricsInput ? (body.lyrics as string).trim() : '';
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

    const balanceResult = await fetchSunoBalance({ apiKey: SUNO_API_KEY });
    if (balanceResult.success) {
      const checkedAt = new Date().toISOString();
      requestMetadata.suno_balance_remaining = balanceResult.balance;
      requestMetadata.suno_balance_checked_at = checkedAt;
      requestMetadata.suno_balance_endpoint = balanceResult.endpoint;
      if (balanceResult.monthly_limit !== undefined) {
        requestMetadata.suno_balance_monthly_limit = balanceResult.monthly_limit;
      }
      if (balanceResult.monthly_usage !== undefined) {
        requestMetadata.suno_balance_monthly_usage = balanceResult.monthly_usage;
      }

      console.log(`💳 [GENERATE-SUNO] Suno credits remaining: ${balanceResult.balance}`);
      if (balanceResult.balance <= 0) {
        const message = 'Недостаточно кредитов Suno для генерации трека. Пополните баланс и попробуйте снова.';
        if (jobId) {
          await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: message }).eq('id', jobId);
        }
        return new Response(JSON.stringify({
          error: message,
          details: {
            provider: 'suno',
            endpoint: balanceResult.endpoint,
            attempts: balanceResult.attempts,
          },
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      logger.warn('⚠️ [GENERATE-SUNO] Не удалось проверить баланс Suno перед генерацией', {
        error: balanceResult.error,
        attempts: balanceResult.attempts,
      });
      requestMetadata.suno_balance_error = balanceResult.error;
      requestMetadata.suno_balance_attempts = balanceResult.attempts;
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

    // The logic for what goes into the 'prompt' field has changed based on the API spec.
    // In custom mode, the lyrics go into the prompt. In non-custom mode, the user's prompt idea goes there.
    const promptForSuno = customModeValue ? (normalizedLyrics || '') : (prompt || '');
    if (!promptForSuno) {
      throw new Error("A prompt or lyrics are required for Suno generation.");
    }

    const sunoPayload: SunoGenerationPayload = {
      prompt: promptForSuno,
      // The 'tags' array is now a single 'style' string.
      style: tags.join(', '),
      title: title || 'Generated Track',
      instrumental: effectiveMakeInstrumental ?? false,
      model: (modelVersion as SunoGenerationPayload['model']) || 'V5',
      customMode: customModeValue ?? false,
      callBackUrl: callbackUrl ?? undefined,
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
  const maxAttempts = 60; // Max 60 attempts = 5 minutes (5s interval)
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
      
      const isFailed = queryResult.status === 'GENERATE_AUDIO_FAILED' || queryResult.status === 'CREATE_TASK_FAILED';
      if (isFailed) {
        const reason = (queryResult.rawResponse as any)?.data?.errorMessage || 'Generation failed';
        await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: reason }).eq('id', trackId);
        if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: reason }).eq('id', jobId);
        console.log('Track generation failed:', trackId, reason);
        return;
      }

      const isComplete = queryResult.status === 'SUCCESS';
      if (isComplete) {
        const successfulTracks = queryResult.tasks.filter(t => t.audioUrl);
        console.log(`🎉 [COMPLETION] Task is SUCCESS. Processing ${successfulTracks.length} tracks.`);

        if (successfulTracks.length === 0) {
          const errorMessage = 'Completed without audio URL in response';
          await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: errorMessage }).eq('id', trackId);
          if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: errorMessage }).eq('id', jobId);
          logger.error('🔴 [COMPLETION] No tracks with audio URL', { trackId });
          return;
        }

        const mainTrack = successfulTracks[0];
        const { data: trackData } = await supabaseAdmin.from('tracks').select('user_id, metadata').eq('id', trackId).single();
        const userId = trackData?.user_id;
        if (!userId) {
          throw new Error('User ID not found for track');
        }

        console.log('📦 [STORAGE] Starting file uploads to Supabase Storage...');
        const audioUrl = await downloadAndUploadAudio(mainTrack.audioUrl, trackId, userId, 'main.mp3', supabaseAdmin);
        let coverUrl = mainTrack.imageUrl;
        if (mainTrack.imageUrl) {
          coverUrl = await downloadAndUploadCover(mainTrack.imageUrl, trackId, userId, 'cover.jpg', supabaseAdmin);
        }

        const pollMetadata = {
          ...(trackData?.metadata as Record<string, unknown> ?? {}),
          suno_data: queryResult.tasks,
          suno_last_poll_endpoint: queryResult.endpoint,
          suno_last_poll_code: queryResult.code ?? null,
          suno_last_poll_at: new Date().toISOString(),
          suno_poll_snapshot: queryResult.rawResponse,
        };

        await supabaseAdmin.from('tracks').update({
          status: 'completed',
          audio_url: audioUrl,
          duration: Math.round(mainTrack.duration),
          lyrics: mainTrack.prompt,
          cover_url: coverUrl,
          suno_id: mainTrack.id,
          model_name: mainTrack.modelName,
          created_at_suno: mainTrack.createTime,
          metadata: pollMetadata,
        }).eq('id', trackId);

        console.log(`✅ [MAIN TRACK] Successfully updated track ${trackId}`);

        if (successfulTracks.length > 1) {
           console.log(`🎵 [VERSIONS] Processing ${successfulTracks.length - 1} additional version(s)...`);
           for (let i = 1; i < successfulTracks.length; i++) {
             const versionTrack = successfulTracks[i];
             const versionAudioUrl = await downloadAndUploadAudio(versionTrack.audioUrl, trackId, userId, `version-${i}.mp3`, supabaseAdmin);
             let versionCoverUrl = versionTrack.imageUrl;
             if (versionTrack.imageUrl) {
               versionCoverUrl = await downloadAndUploadCover(versionTrack.imageUrl, trackId, userId, `version-${i}-cover.jpg`, supabaseAdmin);
             }

             await supabaseAdmin.from('track_versions').insert({
               parent_track_id: trackId,
               version_number: i,
               is_master: false,
               audio_url: versionAudioUrl,
               cover_url: versionCoverUrl,
               duration: Math.round(versionTrack.duration),
               lyrics: versionTrack.prompt,
               suno_id: versionTrack.id,
               metadata: { suno_track_data: versionTrack }
             });
             console.log(`✅ [VERSION ${i}] Successfully created version for track ${trackId}`);
           }
        }

        if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'completed' }).eq('id', jobId);
        console.log(`✅ [COMPLETION] Track ${trackId} completed with ${successfulTracks.length} version(s)`);
        return; // Exit loop on success
      }
      // If status is PENDING or another intermediate state, continue polling.
    } catch (error) {
      logger.error('Polling iteration error', { error: error instanceof Error ? error : new Error(String(error)) });
      if (error instanceof SunoApiError) {
        // Retry on transient errors
        const status = error.details.status ?? 0;
        if (status === 0 || status === 429 || status >= 500) {
          console.log('Retryable Suno polling error, continuing...');
          continue;
        }
      }
      // For other errors, fail the track
      const message = error instanceof Error ? error.message : 'Unknown polling error';
      await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: message }).eq('id', trackId);
      if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: message }).eq('id', jobId);
      return; // Exit loop on failure
    }
  }

  // If loop finishes without success
  const timeoutMessage = 'Generation timeout after ' + maxAttempts * 5 + ' seconds';
  await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: timeoutMessage }).eq('id', trackId);
  if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: timeoutMessage }).eq('id', jobId);
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
