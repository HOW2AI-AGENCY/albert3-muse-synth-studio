import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { validateAudioUrl } from "../_shared/audio-validation.ts";

interface CreateCoverRequest {
  prompt: string;
  tags?: string[];
  title?: string;
  referenceAudioUrl?: string;
  referenceTrackId?: string;
  make_instrumental?: boolean;
  model?: "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5";
  // New parameters for Suno upload-cover endpoint
  customMode?: boolean;
  audioWeight?: number;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
}

const corsHeaders = createCorsHeaders();
const securityHeaders = createSecurityHeaders();

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    // Получаем токен из заголовка Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('❌ [COVER] No Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createSupabaseUserClient(token);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      logger.error('❌ [COVER] Unauthorized', { authError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: CreateCoverRequest = await req.json();
    const { 
      prompt, tags, title, referenceAudioUrl, referenceTrackId, make_instrumental, model,
      customMode, audioWeight, negativeTags, vocalGender, styleWeight, weirdnessConstraint
    } = body;

    const useCustomMode = customMode ?? true; // Default to custom mode

    // Validate uploadUrl is provided
    if (!referenceAudioUrl && !referenceTrackId) {
      return new Response(
        JSON.stringify({ 
          error: 'Reference audio is required for cover creation',
          hint: 'Provide referenceAudioUrl or referenceTrackId'
        }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate custom mode requirements
    if (useCustomMode) {
      if (!title) {
        return new Response(
          JSON.stringify({ error: 'title is required in Custom Mode' }),
          { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (!make_instrumental && !prompt) {
        return new Response(
          JSON.stringify({ error: 'prompt is required in Custom Mode when instrumental is false' }),
          { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Non-custom mode always requires prompt
      if (!prompt) {
        return new Response(
          JSON.stringify({ error: 'prompt is required in Non-custom Mode' }),
          { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    logger.info('🎤 [COVER] Starting cover creation', { 
      userId: user.id, 
      hasReference: !!(referenceAudioUrl || referenceTrackId) 
    });

    const supabaseAdmin = createSupabaseAdminClient();
    let audioReference = referenceAudioUrl;

    // Validate uploaded reference audio
    if (audioReference) {
      logger.info('🔍 [COVER] Validating reference audio URL', { url: audioReference });
      const validation = await validateAudioUrl(audioReference);
      if (!validation.isValid) {
        logger.error('❌ [COVER] Invalid reference audio', { error: validation.error });
        return new Response(
          JSON.stringify({ error: validation.error }),
          { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
        );
      }
      logger.info('✅ [COVER] Reference audio validated');
    }

    // Если указан referenceTrackId, получаем URL из трека
    if (referenceTrackId && !audioReference) {
      const { data: refTrack, error: refError } = await supabaseAdmin
        .from('tracks')
        .select('audio_url')
        .eq('id', referenceTrackId)
        .eq('user_id', user.id)
        .single();

      if (refError || !refTrack?.audio_url) {
        logger.error('❌ [COVER] Reference track not found', { referenceTrackId, error: refError });
        return new Response(
          JSON.stringify({ error: 'Reference track not found or has no audio' }),
          { status: 404, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
        );
      }

      audioReference = refTrack.audio_url;
    }

    // Создаем новый трек для кавера
    const { data: newTrack, error: createError } = await supabaseAdmin
      .from('tracks')
      .insert({
        user_id: user.id,
        title: title || `${prompt.slice(0, 50)} (Cover)`,
        prompt,
        status: 'processing',
        provider: 'suno',
        style_tags: tags,
        reference_audio_url: audioReference,
        model_name: model || 'V4',
        metadata: {
          is_cover: true,
          cover_of: referenceTrackId,
          reference_track_id: referenceTrackId,
          make_instrumental,
          customMode: useCustomMode,
          audioWeight,
          model: model || 'V5',
          original_request: {
            prompt,
            tags,
            title
          }
        }
      })
      .select()
      .single();

    if (createError || !newTrack) {
      logger.error('❌ [COVER] Failed to create cover track', { error: createError });
      throw new Error('Failed to create cover track');
    }

    logger.info('✅ [COVER] Created cover track record', { trackId: newTrack.id });

    // Вызываем Suno API для создания кавера
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const callbackUrl = `${SUPABASE_URL}/functions/v1/suno-callback`;

    // Build Suno API payload according to /api/v1/generate/upload-cover spec
    const sunoPayload: any = {
      uploadUrl: audioReference, // Required: public URL for audio file
      customMode: useCustomMode,
      instrumental: make_instrumental ?? false,
      model: model || 'V5',
      callBackUrl: callbackUrl
    };

    if (useCustomMode) {
      // Custom Mode: requires style, title, prompt (if not instrumental)
      sunoPayload.style = tags?.join(', ') || 'Pop';
      sunoPayload.title = title || newTrack.title;
      
      if (!make_instrumental && prompt) {
        sunoPayload.prompt = prompt; // Used as exact lyrics
      }
    } else {
      // Non-custom Mode: only prompt (AI generates lyrics)
      sunoPayload.prompt = prompt;
      // style and title NOT sent in non-custom mode
    }

    // Optional parameters (validated ranges)
    if (audioWeight !== undefined) {
      sunoPayload.audioWeight = Math.max(0, Math.min(1, audioWeight));
    }
    if (negativeTags) {
      sunoPayload.negativeTags = negativeTags;
    }
    if (vocalGender) {
      sunoPayload.vocalGender = vocalGender;
    }
    if (styleWeight !== undefined) {
      sunoPayload.styleWeight = Math.max(0, Math.min(1, styleWeight));
    }
    if (weirdnessConstraint !== undefined) {
      sunoPayload.weirdnessConstraint = Math.max(0, Math.min(1, weirdnessConstraint));
    }

    logger.info('📤 [COVER] Calling Suno upload-cover API', {
      endpoint: '/api/v1/generate/upload-cover',
      customMode: useCustomMode,
      instrumental: sunoPayload.instrumental,
      hasUploadUrl: !!sunoPayload.uploadUrl,
      hasStyle: !!sunoPayload.style,
      hasTitle: !!sunoPayload.title,
      hasPrompt: !!sunoPayload.prompt,
      audioWeight: sunoPayload.audioWeight,
      model: sunoPayload.model,
      payload: { ...sunoPayload, uploadUrl: '[HIDDEN]' }
    });

    // Correct endpoint for upload-cover
    const endpoint = 'https://api.sunoapi.org/api/v1/generate/upload-cover';

    const sunoResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sunoPayload)
    });

    const sunoData = await sunoResponse.json();

    if (!sunoResponse.ok) {
      logger.error('❌ [COVER] Suno API error', { 
        status: sunoResponse.status, 
        data: sunoData 
      });
      
      // Обновляем статус трека на failed
      await supabaseAdmin
        .from('tracks')
        .update({ 
          status: 'failed', 
          error_message: `Suno API error: ${sunoData.msg || sunoResponse.statusText}` 
        })
        .eq('id', newTrack.id);

      return new Response(
        JSON.stringify({ 
          error: 'Failed to create cover', 
          details: sunoData 
        }),
        { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const taskId = sunoData.data?.taskId || sunoData.taskId;
    
    if (!taskId) {
      logger.error('❌ [COVER] No taskId in Suno response', { sunoData });
      throw new Error('No taskId received from Suno');
    }

    // Обновляем трек с taskId и деталями запроса
    await supabaseAdmin
      .from('tracks')
      .update({ 
        metadata: { 
          ...newTrack.metadata, 
          suno_task_id: taskId,
          suno_request_payload: { ...sunoPayload, uploadUrl: '[HIDDEN]' },
          suno_response: sunoData,
          request_timestamp: new Date().toISOString()
        } 
      })
      .eq('id', newTrack.id);

    logger.info('✅ [COVER] Cover creation started', { 
      trackId: newTrack.id, 
      taskId 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        trackId: newTrack.id, 
        taskId,
        message: 'Cover creation started' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logger.error('❌ [COVER] Unexpected error', { error });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
