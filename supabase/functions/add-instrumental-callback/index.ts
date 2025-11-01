/**
 * Add Instrumental Callback Handler
 * 
 * Receives callbacks from Suno API when add-instrumental tasks complete
 * Handles three callback stages:
 * - "text": Text/lyrics generation completed (33% progress)
 * - "first": First track ready (66% progress)
 * - "complete": All tracks completed (100% progress)
 * - "error": Task failed
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import type { SunoCallbackPayload, CallbackType } from "../_shared/types/callbacks.ts";
import { getDetailedErrorMessage } from "../_shared/types/callbacks.ts";

const corsHeaders = createCorsHeaders({} as Request);

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: SunoCallbackPayload = await req.json();
    logger.info('[ADD-INSTRUMENTAL-CALLBACK] Received callback', { body });

    const { code, msg, data: callbackData } = body;
    const { task_id: taskId, callbackType, data: musicData } = callbackData || {};

    if (!taskId) {
      logger.error('[ADD-INSTRUMENTAL-CALLBACK] Missing taskId in callback');
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
      logger.error('[ADD-INSTRUMENTAL-CALLBACK] Track not found', { taskId, error: findError });
      return new Response(JSON.stringify({ status: 'error', error: 'Track not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const track = tracks[0];

    // Handle successful callback
    if (code === 200) {
      switch (callbackType as CallbackType) {
        case 'text':
          // Stage 1: Text/lyrics generated (33% progress)
          logger.info('[ADD-INSTRUMENTAL-CALLBACK] Text generation completed', {
            trackId: track.id,
            taskId
          });

          await supabase.from('tracks').update({
            status: 'processing',
            progress_percent: 33,
            metadata: {
              ...track.metadata,
              stage: 'text_generated',
              stage_timestamp: new Date().toISOString()
            }
          }).eq('id', track.id);
          break;

        case 'first':
          // Stage 2: First track ready (66% progress)
          if (musicData && musicData.length > 0) {
            const music = musicData[0];
            
            logger.info('[ADD-INSTRUMENTAL-CALLBACK] First track ready', {
              trackId: track.id,
              taskId,
              audioUrl: music.audio_url
            });

            await supabase.from('tracks').update({
              status: 'processing',
              progress_percent: 66,
              audio_url: music.audio_url,
              cover_url: music.image_url,
              duration: music.duration ? Math.floor(music.duration) : null,
              metadata: {
                ...track.metadata,
                stage: 'first_track_ready',
                stage_timestamp: new Date().toISOString(),
                preview_audio_id: music.id
              }
            }).eq('id', track.id);
          }
          break;

        case 'complete':
          // Stage 3: All tracks completed (100% progress)
          if (musicData && musicData.length > 0) {
            const music = musicData[0];
            
            logger.info('[ADD-INSTRUMENTAL-CALLBACK] Add-instrumental completed', {
              trackId: track.id,
              taskId,
              audioUrl: music.audio_url
            });

            await supabase.from('tracks').update({
              status: 'completed',
              progress_percent: 100,
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
                create_time: music.createTime,
                stage: 'completed',
                stage_timestamp: new Date().toISOString()
              }
            }).eq('id', track.id);
          }
          break;

        case 'error':
          logger.error('[ADD-INSTRUMENTAL-CALLBACK] Callback reported error', {
            trackId: track.id,
            taskId,
            msg
          });

          await supabase.from('tracks').update({
            status: 'failed',
            error_message: msg || 'Callback reported error'
          }).eq('id', track.id);
          break;
      }
    } else {
      // Handle error codes (400, 451, 500)
      const detailedError = getDetailedErrorMessage(code, msg);
      
      logger.error('[ADD-INSTRUMENTAL-CALLBACK] Task failed', {
        trackId: track.id,
        taskId,
        code,
        msg,
        detailedError
      });

      await supabase.from('tracks').update({
        status: 'failed',
        error_message: detailedError,
        metadata: {
          ...track.metadata,
          error_code: code,
          error_timestamp: new Date().toISOString()
        }
      }).eq('id', track.id);
    }

    return new Response(JSON.stringify({ status: 'received' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('[ADD-INSTRUMENTAL-CALLBACK] Error processing callback', { error });
    return new Response(JSON.stringify({ status: 'error', error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
