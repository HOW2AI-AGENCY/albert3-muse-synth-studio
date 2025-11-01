/**
 * Music Video Callback Edge Function
 * Handles webhooks from Suno API when music video generation is complete
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { musicVideoCallbackSchema, validateAndParse } from "../_shared/zod-schemas.ts";

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    // ✅ 1. Parse and validate callback payload
    const body = await req.json();
    
    logger.info('Received music video callback', { 
      function: 'music-video-callback',
      code: body.code,
      taskId: body.data?.task_id 
    });

    const validationResult = validateAndParse(musicVideoCallbackSchema, body);
    
    if (!validationResult.success) {
      logger.error('Invalid callback payload', { function: 'music-video-callback', body, errors: validationResult.errors });
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
      logger.warn('Track not found for video task', { function: 'music-video-callback', videoTaskId });
      return new Response(
        JSON.stringify({ status: 'received', message: 'Track not found' }),
        { status: 200, headers: corsHeaders }
      );
    }

    const track = tracks[0];

    // ✅ 3. Handle successful video generation
    if (code === 200 && videoUrl) {
      logger.info('Video generation succeeded', {
        function: 'music-video-callback',
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

      logger.info('Track updated with video URL', {
        function: 'music-video-callback',
        trackId: track.id,
        videoUrl
      });
    }
    // ✅ 4. Handle video generation failure
    else {
      logger.error('Video generation failed', {
        function: 'music-video-callback',
        trackId: track.id,
        videoTaskId,
        code,
        error: msg || 'Unknown error'
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
    logger.error('Music video callback error', { function: 'music-video-callback', error });
    
    // Always return 200 to acknowledge receipt
    return new Response(
      JSON.stringify({ status: 'error', message: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 200, headers: corsHeaders }
    );
  }
});