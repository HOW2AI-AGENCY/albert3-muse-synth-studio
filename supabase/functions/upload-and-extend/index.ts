/**
 * Upload and Extend Audio Edge Function
 * 
 * Sprint 33.2: Upload & Extend Audio
 * Allows users to upload their own audio files and extend them using Suno AI
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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      logger.error('🔴 Authentication failed', { error: userError ?? undefined });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request
    const body = await req.json();
    const {
      uploadUrl,
      defaultParamFlag = true,
      instrumental = false,
      prompt,
      style,
      title,
      continueAt,
      personaId,
      model = 'V5',
      negativeTags,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight
    } = body;

    // Validate required fields based on defaultParamFlag
    if (!uploadUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: uploadUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (defaultParamFlag && !continueAt) {
      return new Response(
        JSON.stringify({ error: 'continueAt is required when defaultParamFlag is true' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (defaultParamFlag && !instrumental && !prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt is required when defaultParamFlag is true and instrumental is false' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create track record
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .insert({
        user_id: user.id,
        title: title || 'Extended Audio',
        prompt: prompt || '',
        status: 'pending',
        provider: 'suno',
        model_name: model,
        style_tags: style ? [style] : [],
        metadata: {
          upload_extend: true,
          reference_audio_url: uploadUrl,
          continue_at: continueAt,
          default_param_flag: defaultParamFlag,
          instrumental,
          persona_id: personaId,
          negative_tags: negativeTags,
          vocal_gender: vocalGender,
          style_weight: styleWeight,
          weirdness_constraint: weirdnessConstraint,
          audio_weight: audioWeight
        }
      })
      .select()
      .single();

    if (trackError) {
      logger.error('Failed to create track', { error: trackError });
      return new Response(
        JSON.stringify({ error: 'Failed to create track record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Call Suno Upload & Extend API
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }
    
    // Get callback URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const normalisedSupabaseUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, "") : null;
    const callbackUrl = normalisedSupabaseUrl
      ? `${normalisedSupabaseUrl}/functions/v1/upload-extend-callback`
      : undefined;

    logger.info('Calling Suno Upload & Extend API', {
      trackId: track.id,
      uploadUrl,
      continueAt,
      model,
      defaultParamFlag,
      instrumental
    });

    // Call Suno API (upload-extend endpoint) - match exact Suno API spec
    const headers = {
      'Authorization': `Bearer ${SUNO_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const uploadExtendPayload: Record<string, unknown> = {
      uploadUrl,
      defaultParamFlag,
      instrumental,
      model,
      callBackUrl: callbackUrl
    };

    // Add optional fields based on defaultParamFlag
    if (defaultParamFlag) {
      if (!instrumental && prompt) uploadExtendPayload.prompt = prompt;
      if (style) uploadExtendPayload.style = style;
      if (title) uploadExtendPayload.title = title;
      if (continueAt !== undefined) uploadExtendPayload.continueAt = continueAt;
      if (personaId) uploadExtendPayload.personaId = personaId;
      if (negativeTags) uploadExtendPayload.negativeTags = negativeTags;
      if (vocalGender) uploadExtendPayload.vocalGender = vocalGender;
      if (styleWeight !== undefined) uploadExtendPayload.styleWeight = styleWeight;
      if (weirdnessConstraint !== undefined) uploadExtendPayload.weirdnessConstraint = weirdnessConstraint;
      if (audioWeight !== undefined) uploadExtendPayload.audioWeight = audioWeight;
    }

    const response = await fetch('https://api.sunoapi.org/api/v1/generate/upload-extend', {
      method: 'POST',
      headers,
      body: JSON.stringify(uploadExtendPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Suno API error', { status: response.status, error: errorText });
      
      // Update track status
      await supabaseAdmin
        .from('tracks')
        .update({
          status: 'failed',
          error_message: `Suno API error: ${errorText}`
        })
        .eq('id', track.id);

      return new Response(
        JSON.stringify({ error: `Suno API error: ${errorText}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    const taskId = result.taskId || result.data?.taskId || result.task_id;

    if (!taskId) {
      logger.error('No taskId in Suno response', { result });
      throw new Error('Failed to get taskId from Suno API');
    }

    // 5. Update track with taskId
    await supabaseAdmin
      .from('tracks')
      .update({
        suno_id: taskId,
        status: 'processing',
        metadata: {
          ...track.metadata,
          suno_task_id: taskId,
          upload_extend: true
        }
      })
      .eq('id', track.id);

    logger.info('✅ Upload & Extend started', { trackId: track.id, taskId });

    // 6. Return response
    return new Response(
      JSON.stringify({
        success: true,
        trackId: track.id,
        taskId,
        message: 'Audio upload and extend started successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🔴 Upload-and-extend error', { error });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMsg,
        errorCode: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
