import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { createSunoClient } from "../_shared/suno.ts";

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseAdminClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error('Unauthorized');

    const { trackId } = await req.json();
    if (!trackId) {
      return new Response(JSON.stringify({ error: 'trackId required' }), { status: 400, headers: corsHeaders });
    }

    const { data: track } = await supabase.from('tracks').select('*').eq('id', trackId).eq('user_id', user.id).single();
    if (!track) {
      return new Response(JSON.stringify({ error: 'Track not found' }), { status: 404, headers: corsHeaders });
    }

    const sunoTaskId = track.suno_id || track.metadata?.suno_task_id;
    if (!sunoTaskId) {
      return new Response(JSON.stringify({ error: 'Not a Suno track' }), { status: 400, headers: corsHeaders });
    }

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    const sunoClient = createSunoClient({ apiKey: SUNO_API_KEY! });
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const callBackUrl = `${SUPABASE_URL}/functions/v1/cover-image-callback`;

    const result = await sunoClient.generateCoverImage({ taskId: sunoTaskId, callBackUrl });
    
    await supabase.from('tracks').update({ 
      metadata: { ...track.metadata, cover_generation_task_id: result.taskId, cover_generation_status: 'processing' } 
    }).eq('id', trackId);

    return new Response(JSON.stringify({ success: true, trackId, coverTaskId: result.taskId }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  } catch (error) {
    logger.error('Cover image generation failed', error as Error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
