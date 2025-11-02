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
  data?: Array<{
    id?: string;
    audioUrl?: string;
    audio_url?: string;
    coverUrl?: string;
    image_url?: string;
    videoUrl?: string;
    video_url?: string;
    duration?: number;
    duration_seconds?: number;
    lyrics?: string;
    prompt?: string;
    title?: string;
  }>;
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
        } else if (payload.data && Array.isArray(payload.data) && payload.data.length > 0) {
          const mainTrack = payload.data[0];
          updateData = {
            status: 'completed',
            progress_percent: 100,
            audio_url: mainTrack.audioUrl || mainTrack.audio_url || null,
            cover_url: mainTrack.coverUrl || mainTrack.image_url || null,
            video_url: mainTrack.videoUrl || mainTrack.video_url || null,
            duration: typeof mainTrack.duration === 'number' ? Math.round(mainTrack.duration) : 
                     (typeof mainTrack.duration_seconds === 'number' ? Math.round(mainTrack.duration_seconds) : null),
            duration_seconds: typeof mainTrack.duration === 'number' ? Math.round(mainTrack.duration) : 
                             (typeof mainTrack.duration_seconds === 'number' ? Math.round(mainTrack.duration_seconds) : null),
            lyrics: mainTrack.lyrics || mainTrack.prompt || null,
          };
          
          // Обновляем title только если его нет
          if (mainTrack.title && !track.title) {
            updateData.title = mainTrack.title;
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

    // ✅ Создаём версии для всех треков из Suno (обычно 2 варианта)
    if (payload.stage === 'complete' && payload.data && Array.isArray(payload.data) && payload.data.length > 0) {
      console.log(`[suno-webhook] Creating ${payload.data.length} track versions`);
      
      for (let i = 0; i < payload.data.length; i++) {
        const versionTrack = payload.data[i];
        
        const versionData = {
          parent_track_id: track.id,
          variant_index: i,
          is_primary_variant: i === 0,
          is_preferred_variant: i === 0,
          suno_id: versionTrack.id || null,
          audio_url: versionTrack.audioUrl || versionTrack.audio_url || null,
          cover_url: versionTrack.coverUrl || versionTrack.image_url || null,
          video_url: versionTrack.videoUrl || versionTrack.video_url || null,
          lyrics: versionTrack.lyrics || versionTrack.prompt || null,
          duration: typeof versionTrack.duration === 'number' ? Math.round(versionTrack.duration) : 
                   (typeof versionTrack.duration_seconds === 'number' ? Math.round(versionTrack.duration_seconds) : null),
          metadata: {
            suno_track_data: versionTrack,
            generated_via: 'webhook',
            suno_task_id: payload.taskId,
          },
        };

        const { error: versionError } = await supabaseClient
          .from('track_versions')
          .upsert(versionData, {
            onConflict: 'parent_track_id,variant_index',
            ignoreDuplicates: false,
          });

        if (versionError) {
          console.error(`[suno-webhook] Error creating version ${i}:`, versionError);
        } else {
          console.log(`[suno-webhook] ✅ Version ${i} (${i === 0 ? 'PRIMARY' : 'ALTERNATE'}) created`);
        }
      }
    }

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
        stage: payload.stage,
        versionsCreated: payload.data?.length || 0,
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
