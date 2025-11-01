/**
 * Upload and Cover Audio Edge Function
 * 
 * Sprint 33.3: Upload & Cover
 * Allows users to upload audio and create covers in different styles
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

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
      prompt,
      style,
      title,
      customMode = true,
      instrumental = false,
      personaId,
      model = 'V5',
      negativeTags,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight
    } = body;

    // Validate required fields based on customMode
    if (!uploadUrl) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: uploadUrl' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (customMode && !instrumental && !prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt is required when customMode is true and instrumental is false' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customMode && !prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt is required in non-custom mode' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Create track record
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .insert({
        user_id: user.id,
        title: title || 'Cover Track',
        prompt: prompt || '',
        status: 'pending',
        provider: 'suno',
        model_name: model,
        style_tags: style ? [style] : [],
        metadata: {
          upload_cover: true,
          reference_audio_url: uploadUrl,
          custom_mode: customMode,
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

    // 4. Call Suno Upload & Cover API
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const normalisedSupabaseUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, "") : null;
    const callbackUrl = normalisedSupabaseUrl
      ? `${normalisedSupabaseUrl}/functions/v1/upload-cover-callback`
      : undefined;

    logger.info('Calling Suno Upload & Cover API', {
      trackId: track.id,
      uploadUrl,
      model,
      customMode,
      instrumental
    });

    const headers = {
      'Authorization': `Bearer ${SUNO_API_KEY}`,
      'Content-Type': 'application/json'
    };

    const uploadCoverPayload: Record<string, unknown> = {
      uploadUrl,
      customMode,
      instrumental,
      model,
      callBackUrl: callbackUrl
    };

    // Add fields based on customMode
    if (customMode) {
      if (style) uploadCoverPayload.style = style;
      if (title) uploadCoverPayload.title = title;
      if (!instrumental && prompt) uploadCoverPayload.prompt = prompt;
      if (personaId) uploadCoverPayload.personaId = personaId;
      if (negativeTags) uploadCoverPayload.negativeTags = negativeTags;
      if (vocalGender) uploadCoverPayload.vocalGender = vocalGender;
      if (styleWeight !== undefined) uploadCoverPayload.styleWeight = styleWeight;
      if (weirdnessConstraint !== undefined) uploadCoverPayload.weirdnessConstraint = weirdnessConstraint;
      if (audioWeight !== undefined) uploadCoverPayload.audioWeight = audioWeight;
    } else {
      uploadCoverPayload.prompt = prompt;
    }

    const response = await fetch('https://api.sunoapi.org/api/v1/generate/upload-cover', {
      method: 'POST',
      headers,
      body: JSON.stringify(uploadCoverPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Suno API error', { status: response.status, error: errorText });
      
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
          suno_task_id: taskId
        }
      })
      .eq('id', track.id);

    logger.info('✅ Upload & Cover started', { trackId: track.id, taskId });

    // 6. Return response
    return new Response(
      JSON.stringify({
        success: true,
        trackId: track.id,
        taskId,
        message: 'Audio cover creation started successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🔴 Upload-and-cover error', { error });

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
