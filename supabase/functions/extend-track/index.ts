import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

interface ExtendTrackRequest {
  trackId: string;
  continueAt?: number; // seconds from start to continue from
  prompt?: string; // optional new prompt for extension
  tags?: string[];
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
      logger.error('❌ [EXTEND] No Authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUser = createSupabaseUserClient(token);
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !user) {
      logger.error('❌ [EXTEND] Unauthorized', { authError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ExtendTrackRequest = await req.json();
    const { trackId, continueAt, prompt, tags } = body;

    if (!trackId) {
      return new Response(
        JSON.stringify({ error: 'trackId is required' }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('🎵 [EXTEND] Starting track extension', { trackId, userId: user.id, continueAt });

    const supabaseAdmin = createSupabaseAdminClient();

    // Получаем оригинальный трек
    const { data: originalTrack, error: trackError } = await supabaseAdmin
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .eq('user_id', user.id)
      .single();

    if (trackError || !originalTrack) {
      logger.error('❌ [EXTEND] Track not found', { trackId, error: trackError });
      return new Response(
        JSON.stringify({ error: 'Track not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!originalTrack.audio_url) {
      logger.error('❌ [EXTEND] Track has no audio', { trackId });
      return new Response(
        JSON.stringify({ error: 'Track has no audio to extend' }),
        { status: 400, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Создаем новый трек для расширенной версии
    const { data: newTrack, error: createError } = await supabaseAdmin
      .from('tracks')
      .insert({
        user_id: user.id,
        title: `${originalTrack.title} (Extended)`,
        prompt: prompt || originalTrack.prompt,
        status: 'processing',
        provider: 'suno',
        style_tags: tags || originalTrack.style_tags,
        metadata: {
          extended_from: trackId,
          continue_at: continueAt,
          original_duration: originalTrack.duration
        }
      })
      .select()
      .single();

    if (createError || !newTrack) {
      logger.error('❌ [EXTEND] Failed to create extended track', { error: createError });
      throw new Error('Failed to create extended track');
    }

    logger.info('✅ [EXTEND] Created extended track record', { 
      newTrackId: newTrack.id, 
      originalTrackId: trackId 
    });

    // Вызываем Suno API для расширения трека
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const callbackUrl = `${SUPABASE_URL}/functions/v1/suno-callback`;

    const sunoPayload = {
      audioId: originalTrack.suno_id || trackId,
      continueAt: continueAt || Math.max(0, (originalTrack.duration || 120) - 20), // extend from 20s before end
      prompt: prompt || originalTrack.prompt,
      tags: tags || originalTrack.style_tags,
      callBackUrl: callbackUrl
    };

    logger.info('📤 [EXTEND] Calling Suno extend API', { payload: sunoPayload });

    const sunoResponse = await fetch('https://api.sunoapi.org/api/v1/extend', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(sunoPayload)
    });

    const sunoData = await sunoResponse.json();

    if (!sunoResponse.ok) {
      logger.error('❌ [EXTEND] Suno API error', { 
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
          error: 'Failed to extend track', 
          details: sunoData 
        }),
        { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const taskId = sunoData.data?.taskId || sunoData.taskId;
    
    if (!taskId) {
      logger.error('❌ [EXTEND] No taskId in Suno response', { sunoData });
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

    logger.info('✅ [EXTEND] Track extension started', { 
      newTrackId: newTrack.id, 
      taskId 
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        trackId: newTrack.id, 
        taskId,
        message: 'Track extension started' 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logger.error('❌ [EXTEND] Unexpected error', { error });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
