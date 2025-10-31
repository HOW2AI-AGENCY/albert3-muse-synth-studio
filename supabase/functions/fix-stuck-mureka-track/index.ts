/**
 * One-time script to fix stuck Mureka track
 * Manually queries Mureka API and updates track in database
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { createMurekaClient } from "../_shared/mureka.ts";

const corsHeaders = createCorsHeaders();

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createSupabaseAdminClient();
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    // Get stuck track
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .select('id, title, metadata, created_at')
      .eq('id', '146c499b-c212-482d-86b1-a26420a81509')
      .single();

    if (trackError || !track) {
      throw new Error(`Track not found: ${trackError?.message}`);
    }

    const taskId = track.metadata?.mureka_task_id;
    if (!taskId) {
      throw new Error('No mureka_task_id in metadata');
    }

    logger.info('🔍 Querying Mureka for stuck track', { trackId: track.id, taskId });

    // Query Mureka API
    const murekaClient = createMurekaClient({ apiKey: murekaApiKey });
    const queryResult = await murekaClient.queryTask(taskId);

    logger.info('📥 Mureka response', { 
      code: queryResult.code,
      hasClips: !!queryResult.data?.clips,
      clipCount: queryResult.data?.clips?.length || 0
    });

    // Update track based on response
    if (queryResult.code === 200 && queryResult.data?.clips && queryResult.data.clips.length > 0) {
      const clip = queryResult.data.clips[0];
      
      await supabaseAdmin
        .from('tracks')
        .update({
          status: 'completed',
          audio_url: clip.audio_url,
          cover_url: clip.image_url,
          video_url: clip.video_url,
          duration_seconds: clip.duration || 0,
          title: clip.title || track.title || 'Generated Track',
        })
        .eq('id', track.id);

      logger.info('✅ Track updated successfully', { 
        trackId: track.id,
        audioUrl: clip.audio_url 
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Track restored successfully',
          track: {
            id: track.id,
            audio_url: clip.audio_url,
            cover_url: clip.image_url,
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else {
      logger.warn('⚠️ Track not ready yet', { 
        taskId, 
        code: queryResult.code,
        status: (queryResult.data as any)?.status
      });

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Track not ready yet',
          status: (queryResult.data as any)?.status,
          code: queryResult.code
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🔴 Fix stuck track error', { error });

    return new Response(
      JSON.stringify({ success: false, error: errorMsg }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
