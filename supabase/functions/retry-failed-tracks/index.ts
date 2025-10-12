import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

/**
 * ✅ PHASE 3.2: Retry Strategy for Failed Tracks
 * Автоматически повторяет генерацию failed треков (макс 3 попытки)
 */

const corsHeaders = createCorsHeaders();

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseAdminClient();
    
    // ✅ Найти failed треки старше 5 минут
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    
    const { data: failedTracks, error: fetchError } = await supabase
      .from('tracks')
      .select('id, metadata, user_id, prompt, title, lyrics, has_vocals, style_tags')
      .eq('status', 'failed')
      .lt('updated_at', fiveMinutesAgo)
      .limit(10);

    if (fetchError) {
      logger.error('Failed to fetch failed tracks', { error: fetchError });
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (!failedTracks || failedTracks.length === 0) {
      logger.info('No failed tracks to retry');
      return new Response(JSON.stringify({ processed: 0, message: 'No failed tracks found' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let retriedCount = 0;
    let skippedCount = 0;

    for (const track of failedTracks) {
      const metadata = track.metadata as Record<string, unknown> || {};
      const retryCount = (metadata.retry_count as number) || 0;
      
      // ✅ Макс 3 попытки
      if (retryCount >= 3) {
        logger.warn(`Track ${track.id} exceeded max retry attempts (${retryCount})`);
        skippedCount++;
        continue;
      }

      try {
        // ✅ Retry generation через generate-suno
        const requestParams = metadata.request_params && typeof metadata.request_params === 'object' 
          ? metadata.request_params as Record<string, unknown>
          : {};
        
        const { error: retryError } = await supabase.functions.invoke('generate-suno', {
          body: {
            trackId: track.id,
            prompt: metadata.prompt || track.prompt,
            title: track.title,
            lyrics: track.lyrics,
            hasVocals: track.has_vocals,
            styleTags: track.style_tags,
            // Сохраняем оригинальные параметры
            ...requestParams,
          }
        });

        if (retryError) {
          logger.error(`Retry failed for track ${track.id}`, retryError);
          continue;
        }

        // ✅ Increment retry counter
        await supabase
          .from('tracks')
          .update({
            metadata: {
              ...metadata,
              retry_count: retryCount + 1,
              last_retry_at: new Date().toISOString(),
              retry_reason: 'auto_retry_failed_tracks'
            }
          })
          .eq('id', track.id);

        retriedCount++;
        logger.info(`✅ Retried track ${track.id} (attempt ${retryCount + 1}/3)`);

      } catch (error) {
        logger.error(`Exception retrying track ${track.id}`, { error: error instanceof Error ? error : new Error(String(error)) });
      }
    }

    logger.info(`Retry job completed: ${retriedCount} retried, ${skippedCount} skipped`);

    return new Response(JSON.stringify({ 
      processed: retriedCount, 
      skipped: skippedCount,
      total: failedTracks.length 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('Retry failed tracks job error', { error: error instanceof Error ? error : new Error(String(error)) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
