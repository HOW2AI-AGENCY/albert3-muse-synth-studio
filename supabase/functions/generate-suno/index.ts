import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { v4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { downloadAndUploadAudio, downloadAndUploadCover, downloadAndUploadVideo } from "../_shared/storage.ts";
import { createSunoClient, SunoApiError, type SunoGenerationPayload } from "../_shared/suno.ts";
import { fetchSunoBalance } from "../_shared/suno-balance.ts";
import { generateSunoSchema, validateAndParse } from "../_shared/zod-schemas.ts";

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
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  referenceAudioUrl?: string;
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
) => Promise<void>;

export const mainHandler = async (req: Request): Promise<Response> => {
  const corsHeaders = {
    ...createCorsHeaders(req),
    ...createSecurityHeaders()
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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
    logger.error('🔴 Supabase credentials are not configured');
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase service role credentials are not configured');
    }

    supabaseAdmin = createSupabaseAdminClient();

    const rawBody = await req.json();
    
    // ✅ Validate request with Zod schema
    const validation = validateAndParse(generateSunoSchema, rawBody);
    if (!validation.success) {
      logger.warn('Invalid request payload', { errors: validation.errors.errors });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters', 
          details: validation.errors.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = validation.data;
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
    const clampRatio = (value?: number) => {
      if (typeof value !== 'number' || Number.isNaN(value)) {
        return undefined;
      }
      return Math.min(Math.max(value, 0), 1);
    };
    const rawNegativeTags = typeof body.negativeTags === 'string' ? body.negativeTags.trim() : '';
    const negativeTags = rawNegativeTags.length > 0 ? rawNegativeTags : undefined;
    const styleWeight = clampRatio(body.styleWeight);
    const weirdnessConstraint = clampRatio(body.weirdnessConstraint);
    const audioWeight = clampRatio(body.audioWeight);
    const vocalGender = body.vocalGender === 'm' || body.vocalGender === 'f' ? body.vocalGender : undefined;

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
    if (negativeTags) {
      requestMetadata.negative_tags = negativeTags;
    }
    if (vocalGender) {
      requestMetadata.vocal_gender = vocalGender;
    }
    if (styleWeight !== undefined) {
      requestMetadata.style_weight = styleWeight;
    }
    if (weirdnessConstraint !== undefined) {
      requestMetadata.weirdness_constraint = weirdnessConstraint;
    }
    if (audioWeight !== undefined) {
      requestMetadata.audio_weight = audioWeight;
    }

    logger.info('🎵 Generation request received', {
      trackId: body.trackId,
      title: body.title,
      promptLength: body.prompt?.length ?? 0,
      tagsCount: tags.length,
      hasLyrics: !!normalizedLyrics,
      hasVocals: effectiveHasVocals,
      customMode: customModeValue,
    });

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Unauthorized: Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      logger.error('🔴 Failed to get user from verified token', { 
        error: userError ?? undefined 
      });
      throw new Error('Unauthorized: Invalid token');
    }

    logger.info('✅ User authenticated', { userId: user.id });
    
    const trackId = body.trackId;
    const prompt = body.prompt;
    const title = body.title;
    const modelVersion = body.model_version;
    const idempotencyKey = body.idempotencyKey || crypto.randomUUID();

    // ✅ PHASE 1 FIX: Use tracks table for idempotency
    const { data: existingTrack } = await supabaseAdmin
      .from('tracks')
      .select('id, status, metadata')
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle();

    if (existingTrack) {
      const sunoTaskId = (existingTrack.metadata as any)?.suno_task_id;
      logger.info('🔁 Idempotent request detected', { 
        trackId: existingTrack.id, 
        status: existingTrack.status,
        sunoTaskId
      });
      return new Response(JSON.stringify({ 
        success: true,
        trackId: existingTrack.id, 
        taskId: sunoTaskId ?? undefined,
        message: "Request already processed (idempotency check)" 
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      logger.error('🔴 SUNO_API_KEY not configured');
      throw new Error('SUNO_API_KEY not configured');
    }

    // ✅ PHASE 1 IMPROVEMENT: Enhanced balance check with better logging
    logger.info('💳 Checking Suno balance...');
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

      logger.info('💳 Suno balance check complete', {
        balance: balanceResult.balance,
        endpoint: balanceResult.endpoint
      });

      if (balanceResult.balance <= 0) {
        const message = 'Недостаточно кредитов Suno для генерации трека. Пополните баланс и попробуйте снова.';
        logger.warn('⚠️ Insufficient Suno credits', { balance: balanceResult.balance });
        throw new Error(message);
      }
    } else {
      logger.warn('⚠️ Не удалось проверить баланс Suno перед генерацией', {
        error: balanceResult.error,
        attempts: balanceResult.attempts,
      });
      requestMetadata.suno_balance_error = balanceResult.error;
      requestMetadata.suno_balance_attempts = balanceResult.attempts;
    }

    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY });
    logger.info('✅ Suno client initialized');

    // ✅ PHASE 1 IMPROVEMENT: Create track BEFORE calling Suno API
    const { trackId: finalTrackId } = await findOrCreateTrack(supabaseAdmin, user.id, {
      trackId,
      title,
      prompt,
      lyrics: normalizedLyrics,
      hasVocals: effectiveHasVocals,
      styleTags: tags,
      requestMetadata,
      idempotencyKey,
    });

    logger.info('✅ Track created/updated', { trackId: finalTrackId });

    const { data: existingTrackData, error: loadErr } = await supabaseAdmin
      .from('tracks')
      .select('metadata,status,lyrics,has_vocals,style_tags')
      .eq('id', finalTrackId)
      .maybeSingle();
    
    if (loadErr) {
      logger.error('🔴 Error loading track', { error: loadErr });
      throw loadErr;
    }

    const existingTaskId = existingTrackData?.metadata?.suno_task_id;
    if (existingTaskId && existingTrackData?.status === 'processing') {
      logger.info('♻️ Resuming existing Suno task', { taskId: existingTaskId, trackId: finalTrackId });
      pollSunoCompletion(String(finalTrackId), existingTaskId, supabaseAdmin, SUNO_API_KEY).catch(err => {
        logger.error('🔴 Resume polling error', { error: err instanceof Error ? err : new Error(String(err)) });
      });
      return new Response(JSON.stringify({ 
        success: true, 
        trackId: finalTrackId, 
        taskId: existingTaskId, 
        message: 'Resumed polling for existing task' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // ✅ FIX: В customMode используем lyrics если есть, иначе prompt
    // В обычном режиме используем prompt
    const promptForSuno = customModeValue 
      ? (normalizedLyrics || prompt || '') 
      : (prompt || '');
    
    if (!promptForSuno) {
      throw new Error("A prompt or lyrics are required for Suno generation.");
    }

    const sunoPayload: SunoGenerationPayload = {
      prompt: promptForSuno,
      tags: tags,
      title: title || 'Generated Track',
      make_instrumental: effectiveMakeInstrumental ?? false,
      model: (modelVersion as SunoGenerationPayload['model']) || 'V5',
      customMode: customModeValue ?? false,
      callBackUrl: callbackUrl ?? undefined,
      ...(negativeTags ? { negativeTags } : {}),
      ...(vocalGender ? { vocalGender } : {}),
      ...(styleWeight !== undefined ? { styleWeight: Number(styleWeight.toFixed(2)) } : {}),
      ...(weirdnessConstraint !== undefined ? { weirdnessConstraint: Number(weirdnessConstraint.toFixed(2)) } : {}),
      ...(audioWeight !== undefined ? { audioWeight: Number(audioWeight.toFixed(2)) } : {}),
      ...(body.referenceAudioUrl ? { referenceAudioUrl: body.referenceAudioUrl } : {}),
    };
    
    logger.info('🎵 Calling Suno API with retry logic', { trackId: finalTrackId, customMode: customModeValue });

    // ✅ FIX: Retry logic with exponential backoff
    let generationResult;
    let retryMetrics;
    try {
      const retryResult = await retryWithBackoff(
        () => sunoClient.generateTrack(sunoPayload),
        retryConfigs.sunoApi,
        'generate-suno'
      );
      
      generationResult = retryResult.result;
      retryMetrics = retryResult.metrics;
      
      logger.info('✅ Suno API call successful', { 
        taskId: generationResult.taskId, 
        trackId: finalTrackId,
        retryInfo: formatRetryMetrics(retryMetrics),
      });
    } catch (err: unknown) {
      logger.error('🔴 Suno API call failed after all retries', { 
        error: err, 
        trackId: finalTrackId,
        attempts: retryMetrics?.totalAttempts || 0,
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Suno generation failed';
      const isRateLimitError = err instanceof SunoApiError && err.statusCode === 429;
      
      // ✅ Сохранить детали ошибки в metadata
      const errorDetails = {
        error_type: isRateLimitError ? 'rate_limit_exceeded' : 'suno_api_error',
        error_message: errorMessage,
        error_timestamp: new Date().toISOString(),
        error_stack: err instanceof Error ? err.stack : undefined,
        retry_attempts: retryMetrics?.totalAttempts || 0,
        retry_errors: retryMetrics?.errors || [],
        payload_sent: {
          prompt: sunoPayload.prompt?.substring(0, 100),
          tags: sunoPayload.tags,
          model: sunoPayload.model,
          customMode: sunoPayload.customMode,
        },
      };

      await supabaseAdmin
        .from('tracks')
        .update({
          status: 'failed',
          error_message: errorMessage,
          metadata: {
            ...requestMetadata,
            last_error: errorDetails,
          }
        })
        .eq('id', finalTrackId);

      // ✅ Возвращаем 200 OK чтобы не trigger retry на клиенте
      return new Response(JSON.stringify({
        success: false,
        trackId: finalTrackId,
        error: errorMessage,
        errorDetails,
        message: isRateLimitError 
          ? 'Rate limit exceeded. Please try again later.'
          : 'Track marked as failed. Check logs and metadata for details.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const taskId = generationResult.taskId;
    const existingMetadata = existingTrackData?.metadata && typeof existingTrackData.metadata === 'object' && !Array.isArray(existingTrackData.metadata)
      ? { ...(existingTrackData.metadata as Record<string, unknown>) }
      : {};

    const updatedMetadata: Record<string, unknown> = {
      ...existingMetadata,
      ...requestMetadata,
      suno_task_id: taskId,
      suno_response: generationResult.rawResponse,
      suno_generate_endpoint: generationResult.endpoint,
      suno_started_at: new Date().toISOString(),
      ...(generationResult.jobId ? { suno_job_id: generationResult.jobId } : {}),
      suno_completion_strategy: callbackUrl ? 'callback' : 'polling',
      suno_callback_url: callbackUrl ?? null,
      // ✅ PHASE 1.4 FIX: Polling active flag
      is_polling_active: true,
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

    // ✅ PHASE 1 FIX: Throw on error
    const { error: updateError } = await supabaseAdmin
      .from('tracks')
      .update(trackUpdateAfterGeneration)
      .eq('id', finalTrackId);

    if (updateError) {
      logger.error('🔴 Error updating track with task ID', { error: updateError, trackId: finalTrackId });
      throw new Error(`Failed to update track: ${updateError.message}`);
    }

    logger.info('✅ Track updated with Suno task ID', { trackId: finalTrackId, taskId });

    if (callbackUrl) {
      logger.info('🔔 Callback URL registered', { callbackUrl, trackId: finalTrackId });
      try {
        const adminForFallback = supabaseAdmin;
        if (adminForFallback) {
          setTimeout(() => {
            logger.info('⏱️ Callback fallback poll triggered', { trackId: finalTrackId, taskId });
            pollSunoCompletion(String(finalTrackId), taskId, adminForFallback, SUNO_API_KEY).catch(err => {
              logger.error('🔴 Fallback polling error', { error: err instanceof Error ? err : new Error(String(err)) });
            });
          }, 3 * 60 * 1000);
        }
      } catch (timeoutError) {
        logger.error('🔴 Failed to schedule fallback poll', { error: timeoutError instanceof Error ? timeoutError : new Error(String(timeoutError)) });
      }
    } else {
      logger.info('🔄 Starting polling', { trackId: finalTrackId, taskId });
      pollSunoCompletion(String(finalTrackId), taskId, supabaseAdmin, SUNO_API_KEY).catch(err => {
        logger.error('🔴 Polling error', { error: err instanceof Error ? err : new Error(String(err)) });
      });
    }

    logger.info('🎉 Generation started successfully', { trackId: finalTrackId, taskId });
    return new Response(JSON.stringify({ 
      success: true, 
      trackId: finalTrackId, 
      taskId: taskId, 
      message: 'Generation started' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    logger.error('🔴 Error in generate-suno function', { 
      error: error instanceof Error ? error : new Error(String(error)),
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
 * ✅ PHASE 1 IMPROVEMENT: Enhanced polling with detailed logging and progress tracking
 */
const defaultPollSunoCompletion: PollSunoCompletionFn = async (
  trackId,
  taskId,
  supabaseAdmin,
  apiKey,
) => {
  const sunoClient = createSunoClient({ apiKey });
  const maxAttempts = 60;
  let attempts = 0;

  logger.info('🔄 Starting polling', { trackId, taskId, maxAttempts });

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    attempts++;

    try {
      logger.info('📊 Polling attempt', { 
        trackId, 
        taskId, 
        attempt: attempts, 
        maxAttempts,
        progress: `${Math.round((attempts / maxAttempts) * 100)}%`
      });

      const queryResult = await sunoClient.queryTask(taskId);

      // ✅ PHASE 1 IMPROVEMENT: Log progress for first few attempts
      if (attempts <= 3) {
        logger.info('📥 Suno poll response', { 
          attempt: attempts,
          endpoint: queryResult.endpoint,
          status: queryResult.status,
          tasksCount: queryResult.tasks?.length ?? 0
        });
      }
      
      const isFailed = queryResult.status === 'GENERATE_AUDIO_FAILED' || queryResult.status === 'CREATE_TASK_FAILED';
      if (isFailed) {
        const reason = (queryResult.rawResponse as any)?.data?.errorMessage || 'Generation failed';
        logger.error('🔴 Generation failed', { trackId, taskId, reason, attempt: attempts });
        await supabaseAdmin.from('tracks').update({ 
          status: 'failed', 
          error_message: reason,
          metadata: {
            suno_last_poll_at: new Date().toISOString(),
            suno_last_poll_attempt: attempts,
            suno_last_poll_status: queryResult.status
          }
        }).eq('id', trackId);
        return;
      }

      const isComplete = queryResult.status === 'SUCCESS';
      if (isComplete) {
        const successfulTracks = queryResult.tasks.filter(t => t.audioUrl);
        logger.info('🎉 Generation complete', { 
          trackId, 
          taskId, 
          tracksCount: successfulTracks.length,
          attempts 
        });

        if (successfulTracks.length === 0) {
          const errorMessage = 'Completed without audio URL in response';
          logger.error('🔴 No audio URL in completed response', { trackId, taskId });
          await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: errorMessage }).eq('id', trackId);
          return;
        }

        const mainTrack = successfulTracks[0];
        const { data: trackData } = await supabaseAdmin.from('tracks').select('user_id, metadata').eq('id', trackId).single();
        const userId = trackData?.user_id;
        if (!userId) {
          throw new Error('User ID not found for track');
        }

        logger.info('📦 Starting file uploads', { trackId, userId });
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
          suno_last_poll_attempt: attempts,
          suno_poll_snapshot: queryResult.rawResponse,
          suno_completed_at: new Date().toISOString(),
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

        logger.info('✅ Main track updated', { trackId, audioUrl });

        if (successfulTracks.length > 1) {
          logger.info('🎵 Processing versions', { count: successfulTracks.length - 1, trackId });
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
            logger.info('✅ Version created', { trackId, versionNumber: i });
          }
        }

        logger.info('🎉 Polling completed successfully', { trackId, versionsCount: successfulTracks.length });
        return;
      }

      // ✅ PHASE 1 IMPROVEMENT: Update track metadata with progress info every 10 attempts
      if (attempts % 10 === 0) {
        const { data: currentTrack } = await supabaseAdmin.from('tracks').select('metadata').eq('id', trackId).maybeSingle();
        await supabaseAdmin.from('tracks').update({
          metadata: {
            ...((currentTrack?.metadata as Record<string, unknown>) ?? {}),
            suno_last_poll_at: new Date().toISOString(),
            suno_last_poll_attempt: attempts,
            suno_last_poll_status: queryResult.status
          }
        }).eq('id', trackId);
        logger.info('📊 Progress updated', { trackId, attempts, status: queryResult.status });
      }

    } catch (error) {
      logger.error('🔴 Polling iteration error', { 
        trackId, 
        taskId, 
        attempt: attempts,
        error: error instanceof Error ? error.message : String(error)
      });
      
      if (error instanceof SunoApiError) {
        const status = error.details.status ?? 0;
        if (status === 0 || status === 429 || status >= 500) {
          logger.warn('⚠️ Retryable error, continuing', { status, trackId, attempt: attempts });
          continue;
        }
      }
      
      const message = error instanceof Error ? error.message : 'Unknown polling error';
      await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: message }).eq('id', trackId);
      return;
    }
  }

  const timeoutMessage = `Generation timeout after ${maxAttempts * 5} seconds`;
  logger.error('🔴 Polling timeout', { trackId, taskId, attempts: maxAttempts });
  await supabaseAdmin.from('tracks').update({ status: 'failed', error_message: timeoutMessage }).eq('id', trackId);
};

let pollSunoCompletionImpl: PollSunoCompletionFn = defaultPollSunoCompletion;

const pollSunoCompletion: PollSunoCompletionFn = async (
  trackId,
  taskId,
  supabaseAdmin,
  apiKey,
) => pollSunoCompletionImpl(trackId, taskId, supabaseAdmin, apiKey);

export const setPollSunoCompletionOverride = (override?: PollSunoCompletionFn) => {
  pollSunoCompletionImpl = override ?? defaultPollSunoCompletion;
};

export const handler = withSentry(mainHandler, { transaction: 'generate-suno' });

if (import.meta.main) {
  serve(handler);
}
