import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders()
};

const mainHandler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");

    if (!SUNO_API_KEY) {
      throw new Error("SUNO_API_KEY is not configured");
    }

    // Extract and validate Authorization header
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    if (!token) {
      console.error('Missing or invalid Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error or no user from token', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { trackId, versionId, separationMode } = await req.json();

    if (!trackId || !separationMode) {
      return new Response(
        JSON.stringify({ error: 'trackId and separationMode are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get track and version info
    let audioId: string;
    let taskId: string;

    if (versionId) {
      const { data: version, error: versionError } = await supabase
        .from('track_versions')
        .select('suno_id, parent_track_id, metadata')
        .eq('id', versionId)
        .single();

      if (versionError || !version) {
        throw new Error('Version not found');
      }

      audioId = version.suno_id;
      // Get taskId from parent track
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('metadata')
        .eq('id', version.parent_track_id)
        .single();

      if (trackError || !track) {
        throw new Error('Parent track not found');
      }

      taskId = track.metadata?.suno_task_id;
    } else {
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('suno_id, metadata')
        .eq('id', trackId)
        .single();

      if (trackError || !track) {
        throw new Error('Track not found');
      }

      audioId = track.suno_id;
      taskId = track.metadata?.suno_task_id;
    }

    if (!audioId || !taskId) {
      throw new Error('Missing Suno IDs');
    }

    console.log('Starting stem separation:', { trackId, versionId, audioId, taskId, separationMode });

    // Call Suno API for stem separation
    const response = await fetch('https://api.sunoapi.org/api/v1/vocal-removal/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        taskId: taskId,
        audioId: audioId,
        type: separationMode, // 'separate_vocal' or 'split_stem'
        callBackUrl: `${SUPABASE_URL}/functions/v1/stems-callback`
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Suno stem separation API error:', response.status, errorText);
      throw new Error(`Suno API failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Suno stem separation response:', data);

    if (data.code !== 200 || !data.data?.taskId) {
      throw new Error(`Suno API error: ${data.msg || 'Unknown error'}`);
    }

    const stemTaskId = data.data.taskId;

    // Store stem separation task info
    await supabase
      .from('tracks')
      .update({
        has_stems: true,
        metadata: {
          ...((await supabase.from('tracks').select('metadata').eq('id', trackId).single()).data?.metadata || {}),
          stem_task_id: stemTaskId,
          stem_separation_mode: separationMode
        }
      })
      .eq('id', trackId);

    console.log('Stem separation started:', { trackId, stemTaskId, separationMode });

    return new Response(
      JSON.stringify({ 
        success: true,
        taskId: stemTaskId,
        separationMode
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in separate-stems function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

const handler = withRateLimit(mainHandler, {
  maxRequests: 10,
  windowMinutes: 1,
  endpoint: 'separate-stems'
});

serve(handler);