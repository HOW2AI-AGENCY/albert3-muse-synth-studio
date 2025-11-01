/**
 * Export WAV Edge Function
 * 
 * Sprint 33.3: WAV Export
 * Exports high-quality WAV files from Suno tracks
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { createSunoClient } from "../_shared/suno.ts";

const corsHeaders = {
  ...createCorsHeaders({} as Request),
  ...createSecurityHeaders()
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { trackId } = body;

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'Missing trackId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get track details
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .eq('user_id', user.id)
      .single();

    if (trackError || !track) {
      return new Response(
        JSON.stringify({ error: 'Track not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!track.suno_id) {
      return new Response(
        JSON.stringify({ error: 'Track does not have Suno ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call Suno WAV Export API
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const normalisedSupabaseUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, "") : null;
    const callbackUrl = normalisedSupabaseUrl
      ? `${normalisedSupabaseUrl}/functions/v1/wav-callback`
      : undefined;

    logger.info('Requesting WAV export', { trackId, sunoId: track.suno_id });

    // Call Suno WAV Export API directly
    const headers = {
      'Authorization': `Bearer ${SUNO_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const wavPayload = {
      taskId: track.suno_id,
      audioId: track.suno_id,
      callBackUrl: callbackUrl
    };

    const response = await fetch('https://api.sunoapi.org/api/v1/generate/wav', {
      method: 'POST',
      headers,
      body: JSON.stringify(wavPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Suno WAV API error', { status: response.status, error: errorText });
      throw new Error(`Suno WAV API error: ${errorText}`);
    }

    const result = await response.json();
    const wavTaskId = result.taskId || result.data?.taskId || result.task_id;

    // Create WAV job record
    const { data: wavJob, error: wavError } = await supabaseAdmin
      .from('wav_jobs')
      .insert({
        user_id: user.id,
        track_id: trackId,
        suno_task_id: wavTaskId,
        audio_id: track.suno_id,
        status: 'pending',
        callback_url: callbackUrl
      })
      .select()
      .single();

    if (wavError) {
      logger.error('Failed to create WAV job', { error: wavError });
      return new Response(
        JSON.stringify({ error: 'Failed to create WAV job' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('✅ WAV export started', { trackId, jobId: wavJob.id });

    return new Response(
      JSON.stringify({
        success: true,
        jobId: wavJob.id,
        taskId: wavTaskId,
        message: 'WAV export started'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🔴 Export-wav error', { error });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMsg
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
