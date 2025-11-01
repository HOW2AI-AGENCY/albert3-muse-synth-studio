/**
 * Music Video Callback Edge Function
 * Handles webhooks from Suno API when music video generation is complete
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logInfo, logError, logWarn } from "../_shared/logger.ts";
import { musicVideoCallbackSchema, validateAndParse } from "../_shared/zod-schemas.ts";

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // ✅ 1. Parse and validate callback payload
    const body = await req.json();
    
    logInfo('Received music video callback', 'music-video-callback', { 
      code: body.code,
      taskId: body.data?.task_id 
    });

    const validationResult = validateAndParse(musicVideoCallbackSchema, body);
    
    if (!validationResult.success) {
      logError('Invalid callback payload', validationResult.errors, 'music-video-callback', { body });
      return new Response(
        JSON.stringify({ error: "Invalid payload" }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { code, msg, data } = validationResult.data;
    const { task_id: videoTaskId, video_url: videoUrl } = data;

    const supabase = createSupabaseAdminClient();

    // ✅ 2. Find track by video_task_id
    const { data: tracks, error: findError } = await supabase
      .from('tracks')
      .select('id, user_id, title')
      .filter('metadata->>video_task_id', 'eq', videoTaskId);

    if (findError || !tracks || tracks.length === 0) {
      logWarn('Track not found for video task', 'music-video-callback', { videoTaskId });
      return new Response(
        JSON.stringify({ status: 'received', message: 'Track not found' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const track = tracks[0];

    // ✅ 3. Handle successful video generation
    if (code === 200 && videoUrl) {
      logInfo('Video generation succeeded', 'music-video-callback', {
        trackId: track.id,
        videoTaskId,
        videoUrl
      });

      // Update track with video URL and status
      await supabase.rpc('update_track_video_metadata', {
        p_track_id: track.id,
        p_video_task_id: videoTaskId,
        p_video_url: videoUrl,
        p_video_status: 'SUCCESS'
      });

      // Create notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: track.user_id,
          type: 'video',
          title: 'Видео готово',
          message: `Музыкальное видео для трека "${track.title}" успешно создано`,
          link: `/workspace/library?track=${track.id}`
        });

      logInfo('Track updated with video URL', 'music-video-callback', {
        trackId: track.id,
        videoUrl
      });
    }
    // ✅ 4. Handle video generation failure
    else {
      logError('Video generation failed', new Error(msg || 'Unknown error'), 'music-video-callback', {
        trackId: track.id,
        videoTaskId,
        code
      });

      let errorMessage = 'Не удалось создать видео';
      
      if (code === 400) {
        errorMessage = 'Ошибка параметров или неподдерживаемый формат аудио';
      } else if (code === 451) {
        errorMessage = 'Не удалось загрузить исходный аудиофайл';
      } else if (code === 500) {
        errorMessage = 'Внутренняя ошибка сервера Suno';
      }

      await supabase.rpc('update_track_video_metadata', {
        p_track_id: track.id,
        p_video_task_id: videoTaskId,
        p_video_status: 'FAILED',
        p_video_error: errorMessage
      });

      // Create error notification for user
      await supabase
        .from('notifications')
        .insert({
          user_id: track.user_id,
          type: 'error',
          title: 'Ошибка создания видео',
          message: `Не удалось создать видео для трека "${track.title}": ${errorMessage}`,
          link: `/workspace/library?track=${track.id}`
        });
    }

    return new Response(
      JSON.stringify({ status: 'received' }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    logError('Music video callback error', error as Error, 'music-video-callback');
    
    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: corsHeaders }
    );
  }
});