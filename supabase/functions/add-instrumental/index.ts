import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';
import { createSupabaseUserClient } from '../_shared/supabase.ts';
import { logger } from '../_shared/logger.ts';

const corsHeaders = createCorsHeaders();

interface AddInstrumentalRequest {
  uploadUrl: string;
  title: string;
  negativeTags: string;
  tags: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  model?: 'V4_5PLUS' | 'V5';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('🔴 [ADD-INSTRUMENTAL] Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseUserClient(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error('🔴 [ADD-INSTRUMENTAL] Unauthorized', { error: userError });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    logger.info('🎵 [ADD-INSTRUMENTAL] Request from user', { userId: user.id });

    const body: AddInstrumentalRequest = await req.json();
    
    if (!body.uploadUrl || !body.title || !body.negativeTags || !body.tags) {
      logger.error('🔴 [ADD-INSTRUMENTAL] Missing required fields', { 
        hasUploadUrl: !!body.uploadUrl, 
        hasTitle: !!body.title, 
        hasNegativeTags: !!body.negativeTags, 
        hasTags: !!body.tags 
      });
      return new Response(JSON.stringify({ 
        error: 'Missing required fields: uploadUrl, title, negativeTags, tags' 
      }), {
        status: 400,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    logger.info('🎵 [ADD-INSTRUMENTAL] Starting add-instrumental', { uploadUrl: body.uploadUrl, title: body.title, tags: body.tags });

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    // Prepare Suno API payload
    const sunoPayload: any = {
      uploadUrl: body.uploadUrl,
      title: body.title,
      negativeTags: body.negativeTags,
      tags: body.tags,
      model: body.model || 'V4_5PLUS',
      callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/suno-callback`
    };

    if (body.vocalGender) sunoPayload.vocalGender = body.vocalGender;
    if (typeof body.styleWeight === 'number') sunoPayload.styleWeight = body.styleWeight;
    if (typeof body.weirdnessConstraint === 'number') sunoPayload.weirdnessConstraint = body.weirdnessConstraint;
    if (typeof body.audioWeight === 'number') sunoPayload.audioWeight = body.audioWeight;

    logger.info('🎵 [ADD-INSTRUMENTAL] Calling Suno API', { payload: sunoPayload });

    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate/add-instrumental', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sunoPayload)
    });

    const sunoData = await sunoResponse.json();

    if (!sunoResponse.ok || sunoData.code !== 200) {
      logger.error('🔴 [ADD-INSTRUMENTAL] Suno API error', { status: sunoResponse.status, data: sunoData });
      return new Response(JSON.stringify({ 
        error: sunoData.msg || 'Failed to call Suno API',
        details: sunoData
      }), {
        status: sunoResponse.status,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    const taskId = sunoData.data?.taskId;
    if (!taskId) {
      throw new Error('No taskId returned from Suno API');
    }

    // Create track record
    const { data: track, error: trackError } = await supabase
      .from('tracks')
      .insert({
        user_id: user.id,
        title: body.title,
        prompt: `Add instrumental to: ${body.title}`,
        status: 'processing',
        provider: 'suno',
        model_name: body.model || 'V4_5PLUS',
        has_vocals: false, // Result will be instrumental
        style_tags: body.tags.split(',').map(t => t.trim()),
        metadata: {
          operation: 'add_instrumental',
          suno_task_id: taskId,
          upload_url: body.uploadUrl,
          negative_tags: body.negativeTags,
          original_tags: body.tags
        }
      })
      .select()
      .single();

    if (trackError) {
      logger.error('🔴 [ADD-INSTRUMENTAL] Failed to create track', { error: trackError });
      throw trackError;
    }

    logger.info('✅ [ADD-INSTRUMENTAL] Task created successfully', { trackId: track.id, sunoTaskId: taskId });

    return new Response(JSON.stringify({
      success: true,
      trackId: track.id,
      sunoTaskId: taskId
    }), {
      status: 200,
      headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('🔴 [ADD-INSTRUMENTAL] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
    });
  }
});
