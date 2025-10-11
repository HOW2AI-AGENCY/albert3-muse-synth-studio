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
  referenceAudioUrl?: string; // URL to reference audio (uploaded file or existing track)
  referenceTrackId?: string; // Alternative: ID of existing track to use as reference
  make_instrumental?: boolean;
  model?: "V3_5" | "V4" | "V4_5" | "V4_5PLUS" | "V5";
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
    const { prompt, tags, title, referenceAudioUrl, referenceTrackId, make_instrumental, model } = body;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt is required' }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
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
          model: model || 'V4'
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

    const sunoPayload: any = {
      prompt,
      tags: tags || [], // ✅ tags массив
      title: title || newTrack.title,
      instrumental: make_instrumental ?? false, // ✅ ИСПРАВЛЕНО: instrumental вместо make_instrumental
      model: model || 'V4',
      callBackUrl: callbackUrl
    };

    // ✅ ИСПРАВЛЕНО: Добавляем referenceAudioUrl (не audioUrl)
    if (audioReference) {
      sunoPayload.referenceAudioUrl = audioReference;
    }

    logger.info('📤 [COVER] Payload transformation', {
      before: { make_instrumental, referenceAudioUrl: audioReference ? '[URL]' : null },
      after: { instrumental: sunoPayload.instrumental, referenceAudioUrl: !!sunoPayload.referenceAudioUrl }
    });

    logger.info('📤 [COVER] Calling Suno cover API', { 
      hasReference: !!audioReference,
      model: model || 'V4',
      payload: { ...sunoPayload, audioUrl: audioReference ? '[HIDDEN]' : undefined }
    });

    // Используем endpoint для кавера с аудио-референсом
    const endpoint = 'https://api.sunoapi.org/api/v1/upload-cover';

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

    // Обновляем трек с taskId
    await supabaseAdmin
      .from('tracks')
      .update({ 
        metadata: { 
          ...newTrack.metadata, 
          suno_task_id: taskId,
          suno_response: sunoData 
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
