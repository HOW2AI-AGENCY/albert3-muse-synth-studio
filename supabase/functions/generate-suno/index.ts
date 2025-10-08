import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { v4 as uuidv4 } from "https://deno.land/std@0.168.0/uuid/mod.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { downloadAndUploadAudio, downloadAndUploadCover, downloadAndUploadVideo } from "../_shared/storage.ts";

export type PollSunoCompletionFn = (
  trackId: string,
  taskId: string,
  supabaseAdmin: any,
  apiKey: string,
  jobId: string | null,
) => Promise<void>;

export const mainHandler = async (req: Request): Promise<Response> => {
  const corsHeaders = {
    ...createCorsHeaders(),
    ...createSecurityHeaders()
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let jobId: string | null = null;
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE') ?? ''
  );

  try {
    const body = await req.json();
    console.log('🎵 [GENERATE-SUNO] Request received:', JSON.stringify({
      trackId: body.trackId,
      title: body.title,
      prompt: body.prompt?.substring(0, 100),
      tags: body.tags,
      make_instrumental: body.make_instrumental,
      model_version: body.model_version,
      wait_audio: body.wait_audio,
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
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('🔴 [GENERATE-SUNO] Auth failed:', authError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ [GENERATE-SUNO] User authenticated:', user.id);

    const { trackId, prompt, tags, title, make_instrumental, model_version, wait_audio } = body;
    const idempotencyKey = body.idempotencyKey || uuidv4();

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
      console.error('🔴 [GENERATE-SUNO] Error creating job record:', jobError);
      throw jobError;
    }
    jobId = job.id;
    console.log('✅ [GENERATE-SUNO] Created new job record:', jobId);

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      console.error('🔴 [GENERATE-SUNO] SUNO_API_KEY not configured');
      throw new Error('SUNO_API_KEY not configured');
    }

    console.log('✅ [GENERATE-SUNO] API key configured');

    let finalTrackId = trackId;

    if (!trackId) {
      console.log('⚠️ [GENERATE-SUNO] No trackId provided, creating new track');
      const { data: newTrack, error: createError } = await supabaseAdmin
        .from('tracks')
        .insert({
          user_id: user.id,
          title: title || 'Untitled Track',
          prompt: prompt || 'Untitled Track',
          provider: 'suno',
          status: 'processing',
          metadata: { prompt, tags, make_instrumental, model_version, wait_audio }
        })
        .select()
        .single();
      
      if (createError) {
        console.error('🔴 [GENERATE-SUNO] Error creating track:', createError);
        throw createError;
      }
      
      finalTrackId = newTrack.id;
      console.log('✅ [GENERATE-SUNO] Created new track:', finalTrackId);
    } else {
      console.log('🔍 [GENERATE-SUNO] Verifying track ownership for trackId:', trackId);
      const { data: existingTrackCheck, error: verifyError } = await supabase
        .from('tracks')
        .select('id, user_id')
        .eq('id', trackId)
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (verifyError || !existingTrackCheck) {
        console.error('🔴 [GENERATE-SUNO] Track not found or unauthorized:', verifyError);
        return new Response(JSON.stringify({ error: 'Track not found or unauthorized' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      console.log('✅ [GENERATE-SUNO] Track ownership verified');
      await supabaseAdmin.from('tracks').update({ status: 'processing', provider: 'suno' }).eq('id', trackId);
    }

    if (!finalTrackId) {
      throw new Error('No trackId provided and failed to create track');
    }

    console.log('🚀 [GENERATE-SUNO] Starting Suno generation for track:', finalTrackId);

    const { data: existingTrack, error: loadErr } = await supabaseAdmin
      .from('tracks')
      .select('metadata,status')
      .eq('id', finalTrackId)
      .maybeSingle();
    if (loadErr) {
      console.error('🔴 [GENERATE-SUNO] Error loading track for resume:', loadErr);
    }

    const existingTaskId = existingTrack?.metadata?.suno_task_id;
    if (existingTaskId && existingTrack?.status === 'processing') {
      console.log('♻️ [GENERATE-SUNO] Resuming existing Suno task:', existingTaskId);
      pollSunoCompletion(finalTrackId, existingTaskId, supabaseAdmin, SUNO_API_KEY, jobId).catch(err => {
        console.error('🔴 [GENERATE-SUNO] Resume polling error:', err);
      });
      return new Response(JSON.stringify({ success: true, trackId: finalTrackId, taskId: existingTaskId, message: 'Resumed polling for existing task' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    const sunoPayload = { prompt, tags, title: title || 'Generated Track', make_instrumental: make_instrumental || false, model_version: model_version || 'chirp-v3-5', wait_audio: wait_audio || false };
    console.log('📤 [GENERATE-SUNO] Sending request to Suno API:', JSON.stringify(sunoPayload, null, 2));

    const response = await fetch('https://api.suno.ai/generate/v2/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUNO_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(sunoPayload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔴 [GENERATE-SUNO] Suno API error:', response.status, errorText);
      throw new Error(`Suno API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log('📥 [GENERATE-SUNO] Suno API response:', JSON.stringify(result, null, 2));

    const taskId = result.id;
    await supabaseAdmin.from('ai_jobs').update({ external_id: taskId, status: 'processing' }).eq('id', jobId);
    const { error: updateError } = await supabaseAdmin
      .from('tracks')
      .update({ status: 'processing', metadata: { ...existingTrack?.metadata, suno_task_id: taskId, suno_response: result, job_id: jobId } })
      .eq('id', finalTrackId);

    if (updateError) {
      console.error('🔴 [GENERATE-SUNO] Error updating track:', updateError);
      throw updateError;
    }

    console.log('✅ [GENERATE-SUNO] Track updated with task ID, starting background polling');
    pollSunoCompletion(finalTrackId, taskId, supabaseAdmin, SUNO_API_KEY, jobId).catch(err => {
      console.error('🔴 [GENERATE-SUNO] Polling error:', err);
    });

    console.log('✅ [GENERATE-SUNO] Generation started successfully');
    return new Response(JSON.stringify({ success: true, trackId: finalTrackId, taskId: taskId, message: 'Generation started, polling for completion' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('🔴 [GENERATE-SUNO] Error in generate-suno function:', error);
    console.error('🔴 [GENERATE-SUNO] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (jobId) {
      await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: error.message }).eq('id', jobId);
    }

    let status = 500;
    let message = 'Internal server error';
    if (error instanceof Error) {
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
    
    return new Response(JSON.stringify({ error: message, details: error instanceof Error ? error.message : 'Unknown error' }), {
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
  const maxAttempts = 60; // Максимум 60 попыток = 5 минут (интервал 5 секунд)
  let attempts = 0;

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
    attempts++;

    try {
      console.log(`Polling Suno task ${taskId}, attempt ${attempts}`);

      const response = await fetch(`https://api.sunoapi.org/api/v1/query?taskId=${taskId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        console.error('Polling error:', response.status);
        continue;
      }

      const data = await response.json();
      
      // Log full response for debugging (first 3 attempts and completion)
      if (attempts <= 3) {
        console.log(`[Attempt ${attempts}] Suno poll response:`, JSON.stringify(data, null, 2));
      }
      
      if (data.code !== 200 || !data.data) {
        console.error('Invalid response:', data);
        continue;
      }

      const tasks = data.data;
      const statusesLog = tasks.map((t: any) => ({ 
        id: t.id || t.taskId, 
        status: t.status, 
        hasAudio: Boolean(t.audioUrl || t.audio_url || t.stream_audio_url || t.source_stream_audio_url),
        hasCover: Boolean(t.image_url || t.image_large_url || t.imageUrl),
        hasVideo: Boolean(t.video_url || t.videoUrl)
      }));
      console.log('Suno poll statuses:', statusesLog);
      
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
          console.error('🔴 [COMPLETION] No tracks with audio URL. Track:', trackId);
          return;
        }
        
        console.log(`✅ [COMPLETION] Found ${successfulTracks.length} successful tracks with audio`);
        
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
        
        const { data: trackData } = await supabaseAdmin.from('tracks').select('user_id').eq('id', trackId).single();
        const userId = trackData?.user_id;
        if (!userId) {
          throw new Error('User ID not found for track');
        }
        
        console.log('📦 [STORAGE] Starting file uploads to Supabase Storage...');
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

        const { error: updateMainError } = await supabaseAdmin.from('tracks').update({
          status: 'completed', audio_url: audioUrl, duration: Math.round(duration), duration_seconds: Math.round(duration),
          lyrics: actualLyrics, cover_url: coverUrl, video_url: videoUrl, suno_id: sunoId, model_name: modelName,
          created_at_suno: createdAtSuno, metadata: { suno_data: tasks }
        }).eq('id', trackId);

        if (updateMainError) {
          console.error('🔴 [MAIN TRACK] Failed to update:', updateMainError);
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
            
            const { error: insertVersionError } = await supabaseAdmin.from('track_versions').insert({
              parent_track_id: trackId, version_number: i, is_master: false, audio_url: versionAudioUrl,
              cover_url: versionCoverUrl, video_url: versionVideoUrl, duration: Math.round(versionDuration),
              lyrics: versionLyrics, suno_id: versionSunoId,
              metadata: { suno_track_data: versionTrack, created_from_generation: true, generation_task_id: taskId }
            });
            
            if (insertVersionError) {
              console.error(`🔴 [VERSION ${i}] Failed to insert:`, insertVersionError);
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
      console.error('Polling iteration error:', error);
      if (jobId) await supabaseAdmin.from('ai_jobs').update({ status: 'failed', error_message: error.message }).eq('id', jobId);
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

// Применяем rate limiting middleware
export const handler = withRateLimit(mainHandler, {
  maxRequests: 10,
  windowMinutes: 1, // 1 minute
  endpoint: 'generate-suno'
});

if (import.meta.main) {
  serve(handler);
}
