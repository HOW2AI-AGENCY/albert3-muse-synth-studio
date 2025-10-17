/**
 * Suno Webhook Handler
 * SPRINT 28: GEN-FIX-001
 * 
 * Обрабатывает callback'и от Suno API для обновления статуса генерации
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SunoWebhookPayload {
  taskId: string;
  stage: 'submit' | 'processing' | 'complete';
  data?: {
    audioUrl?: string;
    coverUrl?: string;
    videoUrl?: string;
    duration?: number;
    lyrics?: string;
    title?: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload: SunoWebhookPayload = await req.json();
    
    console.log(`[suno-webhook] Received callback: stage=${payload.stage}, taskId=${payload.taskId}`);

    // Находим трек по suno_id (taskId от Suno)
    const { data: track, error: fetchError } = await supabaseClient
      .from('tracks')
      .select('id, status, user_id, title')
      .eq('suno_id', payload.taskId)
      .single();

    if (fetchError || !track) {
      console.error('[suno-webhook] Track not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Track not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Обработка разных стадий
    let updateData: Record<string, unknown> = {};
    
    switch (payload.stage) {
      case 'submit':
        updateData = {
          status: 'processing',
          progress_percent: 0,
        };
        break;
        
      case 'processing':
        updateData = {
          status: 'processing',
          progress_percent: 50,
        };
        break;
        
      case 'complete':
        if (payload.error) {
          updateData = {
            status: 'failed',
            error_message: payload.error.message,
            progress_percent: 0,
          };
        } else if (payload.data) {
          updateData = {
            status: 'completed',
            progress_percent: 100,
            audio_url: payload.data.audioUrl || null,
            cover_url: payload.data.coverUrl || null,
            video_url: payload.data.videoUrl || null,
            duration: payload.data.duration || null,
            lyrics: payload.data.lyrics || null,
          };
          
          // Обновляем title только если его нет
          if (payload.data.title && !track.title) {
            updateData.title = payload.data.title;
          }
        }
        break;
    }

    // Обновляем трек
    const { error: updateError } = await supabaseClient
      .from('tracks')
      .update(updateData)
      .eq('id', track.id);

    if (updateError) {
      console.error('[suno-webhook] Failed to update track:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update track' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[suno-webhook] Track updated successfully: ${track.id} -> ${payload.stage}`);

    // Логируем callback
    await supabaseClient
      .from('callback_logs')
      .insert({
        track_id: track.id,
        callback_type: 'suno_webhook',
        payload: payload as unknown as Record<string, unknown>,
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        trackId: track.id,
        stage: payload.stage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[suno-webhook] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
