import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { 
  SunoCallbackPayload, 
  getDetailedErrorMessage 
} from "../_shared/types/callbacks.ts";
import { parseDuration } from "../_shared/duration-parser.ts";


serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = createCorsHeaders(req);

  try {
    const payload: SunoCallbackPayload = await req.json();
    const { code, msg, data } = payload;
    const { callbackType, task_id: taskId, data: musicData } = data;

    logger.info("[ADD-VOCALS-CALLBACK] Received callback", {
      taskId,
      callbackType,
      code,
      msg
    });

    const supabase = createSupabaseAdminClient();

    // Find track by suno_id
    const { data: track, error: findError } = await supabase
      .from('tracks')
      .select('*')
      .eq('suno_id', taskId)
      .single();

    if (findError || !track) {
      logger.error("[ADD-VOCALS-CALLBACK] Track not found", { 
        taskId, 
        error: findError 
      });
      return new Response(
        JSON.stringify({ error: "Track not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle success callback
    if (code === 200) {
      switch (callbackType) {
        case 'text':
          // Stage 1: Lyrics/text generated
          await supabase.from('tracks').update({
            status: 'processing',
            progress_percent: 33,
            metadata: {
              ...track.metadata,
              stage: 'text_generated',
              stage_timestamp: new Date().toISOString()
            }
          }).eq('id', track.id);
          
          logger.info("[ADD-VOCALS-CALLBACK] Text generation completed", { trackId: track.id });
          break;

        case 'first':
          // Stage 2: First vocal track ready
          if (musicData && musicData.length > 0) {
            const music = musicData[0];
            await supabase.from('tracks').update({
              status: 'processing',
              progress_percent: 66,
              audio_url: music.audio_url,
              cover_url: music.image_url,
              duration: music.duration ? parseFloat(music.duration) : null,
              metadata: {
                ...track.metadata,
                stage: 'first_track_ready',
                stage_timestamp: new Date().toISOString(),
                preview_audio_id: music.id
              }
            }).eq('id', track.id);
            
            logger.info("[ADD-VOCALS-CALLBACK] First vocal track ready", { 
              trackId: track.id,
              audioId: music.id 
            });
          }
          break;

        case 'complete':
          // Stage 3: All vocal tracks completed
          if (musicData && musicData.length > 0) {
            const first = musicData[0];
            const durationSec = parseDuration(first.duration);

            // 1) Update main track fields + persist raw Suno variants for fallback
            await supabase.from('tracks').update({
              status: 'completed',
              progress_percent: 100,
              audio_url: first.audio_url,
              cover_url: first.image_url,
              video_url: first.video_url,
              lyrics: first.prompt,
              duration: durationSec,
              duration_seconds: durationSec,
              has_vocals: true,
              metadata: {
                ...track.metadata,
                suno_audio_id: first.id,
                model_name: first.model_name,
                tags: first.tags,
                create_time: first.createTime,
                stage: 'completed',
                stage_timestamp: new Date().toISOString(),
                source_audio_url: first.source_audio_url,
                stream_audio_url: first.stream_audio_url,
                suno_data: musicData, // ✅ keep full variants snapshot for UI fallback
              }
            }).eq('id', track.id);

            // 2) Upsert ALL variants into track_versions (0 = primary, 1 = alternate)
            const versionsPayload = musicData.map((m, i) => ({
              parent_track_id: track.id,
              variant_index: i,
              is_primary_variant: i === 0,
              is_preferred_variant: i === 0,
              audio_url: m.audio_url,
              cover_url: m.image_url,
              video_url: m.video_url,
              lyrics: m.prompt,
              duration: parseDuration(m.duration),
              suno_id: m.id,
              metadata: {
                suno_track_data: m,
                generated_via: 'add_vocals_callback',
              },
            }));

            const { error: versionsError } = await supabase
              .from('track_versions')
              .upsert(versionsPayload, { onConflict: 'parent_track_id,variant_index' });

            if (versionsError) {
              logger.error('[ADD-VOCALS-CALLBACK] Failed to upsert track versions', { error: versionsError });
            } else {
              logger.info('[ADD-VOCALS-CALLBACK] Track versions upserted', {
                trackId: track.id,
                variants: musicData.length,
              });
            }
          }
          break;

        case 'error':
          await supabase.from('tracks').update({
            status: 'failed',
            error_message: msg || 'Callback reported error',
            metadata: {
              ...track.metadata,
              error_code: code,
              error_timestamp: new Date().toISOString()
            }
          }).eq('id', track.id);
          
          logger.error("[ADD-VOCALS-CALLBACK] Task error", { 
            trackId: track.id, 
            msg 
          });
          break;
      }
    } else {
      // Handle error callback
      const detailedError = getDetailedErrorMessage(code, msg);
      
      await supabase.from('tracks').update({
        status: 'failed',
        error_message: detailedError,
        metadata: {
          ...track.metadata,
          error_code: code,
          error_timestamp: new Date().toISOString()
        }
      }).eq('id', track.id);
      
      logger.error("[ADD-VOCALS-CALLBACK] Task failed", {
        trackId: track.id,
        code,
        msg,
        detailedError
      });
    }

    // Log callback to callback_logs table
    await supabase.from('callback_logs').insert({
      track_id: track.id,
      callback_type: `add_vocals_${callbackType}`,
      payload: payload as any,
      error_message: code !== 200 ? msg : null
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    logger.error("[ADD-VOCALS-CALLBACK] Error processing callback", { 
      error: error instanceof Error ? error.message : error 
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
