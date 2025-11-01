/**
 * Upload and Extend Audio Callback Handler
 * 
 * Receives callbacks from Suno API when upload-extend tasks complete
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = createCorsHeaders({} as Request);

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    logger.info('[UPLOAD-EXTEND-CALLBACK] Received callback', { body });

    const { code, msg, data: callbackData } = body;
    const { task_id: taskId, callbackType, data: musicData } = callbackData || {};

    if (!taskId) {
      logger.error('[UPLOAD-EXTEND-CALLBACK] Missing taskId in callback');
      return new Response(JSON.stringify({ status: 'error', error: 'Missing taskId' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createSupabaseAdminClient();

    // Find track by suno_id
    const { data: tracks, error: findError } = await supabase
      .from('tracks')
      .select('*')
      .eq('suno_id', taskId)
      .limit(1);

    if (findError || !tracks || tracks.length === 0) {
      logger.error('[UPLOAD-EXTEND-CALLBACK] Track not found', { taskId, error: findError });
      return new Response(JSON.stringify({ status: 'error', error: 'Track not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const track = tracks[0];

    // Handle different callback stages
    if (code === 200 && callbackType === 'complete' && musicData && musicData.length > 0) {
      const music = musicData[0];
      
      logger.info('[UPLOAD-EXTEND-CALLBACK] Upload-extend completed', {
        trackId: track.id,
        taskId,
        audioUrl: music.audio_url
      });

      await supabase
        .from('tracks')
        .update({
          status: 'completed',
          audio_url: music.audio_url,
          cover_url: music.image_url,
          video_url: music.video_url,
          lyrics: music.prompt,
          duration: music.duration ? Math.floor(music.duration) : null,
          duration_seconds: music.duration ? Math.floor(music.duration) : null,
          metadata: {
            ...track.metadata,
            suno_audio_id: music.id,
            model_name: music.model_name,
            tags: music.tags,
            create_time: music.createTime
          }
        })
        .eq('id', track.id);

    } else if (code !== 200 || callbackType === 'error') {
      logger.error('[UPLOAD-EXTEND-CALLBACK] Upload-extend failed', {
        trackId: track.id,
        taskId,
        code,
        msg
      });

      await supabase
        .from('tracks')
        .update({
          status: 'failed',
          error_message: msg || 'Upload-extend failed'
        })
        .eq('id', track.id);
    } else if (callbackType === 'text' || callbackType === 'first') {
      logger.info('[UPLOAD-EXTEND-CALLBACK] Intermediate stage', {
        trackId: track.id,
        callbackType
      });
      // Keep status as 'processing' for intermediate stages
    }

    return new Response(JSON.stringify({ status: 'received' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('[UPLOAD-EXTEND-CALLBACK] Error processing callback', { error });
    return new Response(JSON.stringify({ status: 'error', error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
