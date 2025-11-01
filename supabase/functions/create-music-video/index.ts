/**
 * Create Music Video Edge Function
 * Generates an MP4 video with visualizations for a music track using Suno API
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { createMusicVideoSchema, validateAndParse } from "../_shared/zod-schemas.ts";

const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');

interface CreateMusicVideoRequest {
  trackId: string;
  audioId: string;
  author?: string;
  domainName?: string;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    // ✅ 1. Extract and validate user
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      logger.error('Unauthorized request', { function: 'create-music-video' });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // ✅ 2. Parse and validate request body
    const body = await req.json();
    const validationResult = validateAndParse(createMusicVideoSchema, body);
    
    if (!validationResult.success) {
      logger.error('Validation failed', { function: 'create-music-video', body });
      return new Response(
        JSON.stringify({ 
          error: "Validation failed", 
          details: validationResult.errors.format() 
        }),
        { status: 400, headers: corsHeaders }
      );
    }

    const { trackId, audioId, author, domainName } = validationResult.data as CreateMusicVideoRequest;

    logger.info('Creating music video', {
      function: 'create-music-video',
      trackId,
      audioId,
      userId,
      hasAuthor: !!author,
      hasDomain: !!domainName
    });

    // ✅ 3. Verify track ownership
    const supabase = createSupabaseAdminClient();
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .select('id, user_id, suno_id, metadata')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      logger.error('Track not found', { function: 'create-music-video', trackId, error: trackError });
      return new Response(
        JSON.stringify({ error: "Track not found" }),
        { status: 404, headers: corsHeaders }
      );
    }

    if (track.user_id !== userId) {
      logger.error('Unauthorized track access', {
        function: 'create-music-video',
        trackId,
        userId,
        trackUserId: track.user_id
      });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: corsHeaders }
      );
    }

    // ✅ 4. Check if video already exists
    const existingVideoTaskId = track.metadata?.video_task_id;
    const existingVideoStatus = track.metadata?.video_status;
    
    if (existingVideoTaskId && (existingVideoStatus === 'PENDING' || existingVideoStatus === 'SUCCESS')) {
      logger.info('Video already exists or in progress', {
        function: 'create-music-video',
        trackId,
        videoTaskId: existingVideoTaskId,
        status: existingVideoStatus
      });
      return new Response(
        JSON.stringify({ 
          success: true,
          taskId: existingVideoTaskId,
          message: existingVideoStatus === 'SUCCESS' ? 'Video already generated' : 'Video generation in progress'
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ✅ 5. Get task ID from metadata
    const taskId = track.suno_id || track.metadata?.suno_task_id;
    if (!taskId) {
      logger.error('Suno task ID not found', { function: 'create-music-video', trackId });
      return new Response(
        JSON.stringify({ error: "Track was not generated via Suno AI" }),
        { status: 400, headers: corsHeaders }
      );
    }

    // ✅ 6. Prepare callback URL
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const callBackUrl = `${SUPABASE_URL}/functions/v1/music-video-callback`;

    logger.info('Calling Suno MP4 API', { function: 'create-music-video', taskId, audioId, callBackUrl });

    // ✅ 7. Call Suno API to create music video
    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/mp4/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId,
        audioId,
        callBackUrl,
        author: author || undefined,
        domainName: domainName || undefined
      })
    });

    const sunoData = await sunoResponse.json();

    if (!sunoResponse.ok) {
      logger.error('Suno API error', { function: 'create-music-video', status: sunoResponse.status, sunoData });
      
      // Handle specific error codes
      if (sunoResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: corsHeaders }
        );
      }
      
      if (sunoResponse.status === 409) {
        return new Response(
          JSON.stringify({ error: "Video already exists for this track." }),
          { status: 409, headers: corsHeaders }
        );
      }

      throw new Error(`Suno API error: ${sunoData.msg || 'Unknown error'}`);
    }

    const videoTaskId = sunoData.data?.taskId;

    if (!videoTaskId) {
      throw new Error('No task ID returned from Suno API');
    }

    // ✅ 8. Update track with video task ID
    await supabase.rpc('update_track_video_metadata', {
      p_track_id: trackId,
      p_video_task_id: videoTaskId,
      p_video_status: 'PENDING'
    });

    logger.info('Music video generation started', {
      function: 'create-music-video',
      trackId,
      videoTaskId,
      userId
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        taskId: videoTaskId,
        message: 'Video generation started'
      }),
      { status: 200, headers: corsHeaders }
    );

  } catch (error) {
    logger.error('Failed to create music video', { function: 'create-music-video', error });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: corsHeaders }
    );
  }
});