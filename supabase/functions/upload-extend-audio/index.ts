import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';
import { createSupabaseUserClient } from '../_shared/supabase.ts';
import { logger } from '../_shared/logger.ts';

const corsHeaders = createCorsHeaders();

interface UploadExtendAudioRequest {
  uploadUrl: string;
  defaultParamFlag: boolean;
  instrumental?: boolean;
  prompt?: string;
  style?: string;
  title?: string;
  continueAt?: number;
  model?: 'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5';
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
}

Deno.serve(async (req: any) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('🔴 [UPLOAD-EXTEND] Missing authorization header');
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createSupabaseUserClient(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      logger.error('🔴 [UPLOAD-EXTEND] Unauthorized', { error: userError });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    logger.info('🎵 [UPLOAD-EXTEND] Request from user', { userId: user.id });

    const body: UploadExtendAudioRequest = await req.json();
    
    if (!body.uploadUrl || typeof body.defaultParamFlag !== 'boolean') {
      logger.error('🔴 [UPLOAD-EXTEND] Missing required fields', { hasUploadUrl: !!body.uploadUrl, hasDefaultParamFlag: typeof body.defaultParamFlag === 'boolean' });
      return new Response(JSON.stringify({ error: 'Missing required fields: uploadUrl, defaultParamFlag' }), {
        status: 400,
        headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
      });
    }

    logger.info('🎵 [UPLOAD-EXTEND] Starting upload-extend', { uploadUrl: body.uploadUrl, defaultParamFlag: body.defaultParamFlag, model: body.model });

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    // Prepare Suno API payload
    const sunoPayload: any = {
      uploadUrl: body.uploadUrl,
      defaultParamFlag: body.defaultParamFlag,
      model: body.model || 'V4_5PLUS',
      callBackUrl: `${Deno.env.get('SUPABASE_URL')}/functions/v1/suno-callback`
    };

    if (body.defaultParamFlag) {
      if (!body.style || !body.title || typeof body.continueAt !== 'number') {
        logger.error('🔴 [UPLOAD-EXTEND] Missing required default params', { hasStyle: !!body.style, hasTitle: !!body.title, hasContinueAt: typeof body.continueAt === 'number' });
        return new Response(JSON.stringify({ 
          error: 'When defaultParamFlag is true, style, title, and continueAt are required' 
        }), {
          status: 400,
          headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
        });
      }
      sunoPayload.style = body.style;
      sunoPayload.title = body.title;
      sunoPayload.continueAt = body.continueAt;
      sunoPayload.instrumental = body.instrumental ?? true;
      
      if (!body.instrumental && body.prompt) {
        sunoPayload.prompt = body.prompt;
      }
    }

    if (body.negativeTags) sunoPayload.negativeTags = body.negativeTags;
    if (body.vocalGender) sunoPayload.vocalGender = body.vocalGender;
    if (typeof body.styleWeight === 'number') sunoPayload.styleWeight = body.styleWeight;
    if (typeof body.weirdnessConstraint === 'number') sunoPayload.weirdnessConstraint = body.weirdnessConstraint;
    if (typeof body.audioWeight === 'number') sunoPayload.audioWeight = body.audioWeight;

    logger.info('🎵 [UPLOAD-EXTEND] Calling Suno API', { payload: sunoPayload });

    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/generate/upload-extend', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sunoPayload)
    });

    const sunoData = await sunoResponse.json();

    if (!sunoResponse.ok || sunoData.code !== 200) {
      logger.error('🔴 [UPLOAD-EXTEND] Suno API error', { status: sunoResponse.status, data: sunoData });
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
        title: body.title || 'Extended Audio',
        prompt: body.prompt || 'Audio extension',
        status: 'processing',
        provider: 'suno',
        model_name: body.model || 'V4_5PLUS',
        has_vocals: !body.instrumental,
        metadata: {
          operation: 'upload_extend',
          suno_task_id: taskId,
          upload_url: body.uploadUrl,
          continue_at: body.continueAt,
          default_param_flag: body.defaultParamFlag
        }
      })
      .select()
      .single();

    if (trackError) {
      logger.error('🔴 [UPLOAD-EXTEND] Failed to create track', { error: trackError });
      throw trackError;
    }

    logger.info('✅ [UPLOAD-EXTEND] Task created successfully', { trackId: track.id, sunoTaskId: taskId });

    return new Response(JSON.stringify({
      success: true,
      trackId: track.id,
      sunoTaskId: taskId
    }), {
      status: 200,
      headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    logger.error('🔴 [UPLOAD-EXTEND] Unexpected error', { error: error instanceof Error ? error.message : 'Unknown' });
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ 
      error: errorMessage
    }), {
      status: 500,
      headers: { ...corsHeaders, ...createSecurityHeaders(), 'Content-Type': 'application/json' }
    });
  }
});
