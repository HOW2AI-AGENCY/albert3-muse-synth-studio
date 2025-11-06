/**
 * Suno Webhook Handler
 * SPRINT 28: GEN-FIX-001
 * 
 * Обрабатывает callback'и от Suno API для обновления статуса генерации
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { extractTitle } from '../_shared/title-extractor.ts';
import { detectLanguage } from '../_shared/language-detector.ts';
import { logger } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Suno API Webhook Payload Structure (from official docs)
 * 
 * callbackType stages:
 * - text: Lyrics generation completed
 * - first: First track (1/2) completed
 * - complete: All tracks (2/2) completed
 * - error: Generation failed
 */
interface SunoWebhookPayload {
  code: 200 | 400 | 451 | 500;
  msg: string;
  data: {
    callbackType: 'text' | 'first' | 'complete' | 'error';
    task_id: string;
    data: Array<{
      id: string;
      audio_url: string;
      source_audio_url?: string;
      stream_audio_url?: string;
      source_stream_audio_url?: string;
      image_url?: string;
      source_image_url?: string;
      video_url?: string;
      prompt?: string;
      model_name?: string;
      title?: string;
      tags?: string;
      createTime?: string;
      duration?: number;
    }> | null;
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

    const taskId = payload.data.task_id;
    const callbackType = payload.data.callbackType;

    // =====================================================
    // SEC-002: WEBHOOK IDEMPOTENCY CHECK
    // =====================================================
    // Generate idempotency key from webhook headers or payload
    const webhookId =
      req.headers.get('X-Delivery-Id') ||
      req.headers.get('X-Webhook-Id') ||
      `suno-${taskId}-${callbackType}-${Date.now()}`;

    // Check if webhook was already processed
    const { data: alreadyProcessed } = await supabaseClient
      .rpc('check_webhook_processed', { p_webhook_id: webhookId });

    if (alreadyProcessed) {
      logger.info(`[suno-webhook] ↪︎ Webhook already processed (idempotent)`, {
        webhookId,
        taskId,
        callbackType,
      });

      return new Response(
        JSON.stringify({
          success: true,
          idempotent: true,
          message: 'Webhook already processed',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Register webhook delivery
    await supabaseClient.rpc('register_webhook_delivery', {
      p_webhook_id: webhookId,
      p_provider: 'suno',
      p_task_id: taskId,
      p_track_id: null, // Will update after finding track
      p_payload: payload as unknown as Record<string, unknown>,
    });

    logger.info(`[suno-webhook] 📥 Received callback`, {
      code: payload.code,
      msg: payload.msg,
      callbackType,
      taskId,
      tracksCount: payload.data.data?.length || 0,
      webhookId,
    });

    // Находим трек по suno_id (task_id от Suno)
    const { data: track, error: fetchError } = await supabaseClient
      .from('tracks')
      .select('id, status, user_id, title, prompt, lyrics')
      .eq('suno_id', taskId)
      .single();

    if (fetchError || !track) {
      logger.error('[suno-webhook] Track not found:', { error: fetchError });
      return new Response(
        JSON.stringify({ error: 'Track not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Получаем массив треков из правильного места в payload
    const items = payload.data.data || [];
    
    logger.info(`[suno-webhook] 🎵 Processing ${items.length} tracks for callbackType=${callbackType}`);

    // Обработка разных типов callback
    let updateData: Record<string, unknown> = {};
    
    switch (callbackType) {
      case 'text':
        // Текст сгенерирован
        updateData = {
          status: 'processing',
          progress_percent: 33,
          metadata: {
            stage: 'text_generated',
            stage_description: 'Lyrics generated, preparing audio',
          },
        };
        logger.info(`[suno-webhook] ✍️ Text generation completed for ${taskId}`);
        break;
        
      case 'first': {
        // Первый трек готов (1/2)
        const firstTrack = items[0];
        if (firstTrack) {
          const audioUrl = firstTrack.audio_url || firstTrack.stream_audio_url || firstTrack.source_audio_url || null;
          const coverUrl = firstTrack.image_url || firstTrack.source_image_url || null;
          const videoUrl = firstTrack.video_url || null;
          const duration = Math.round(firstTrack.duration || 0);
          
          updateData = {
            status: 'processing',
            progress_percent: 66,
            audio_url: audioUrl,
            cover_url: coverUrl,
            video_url: videoUrl,
            duration,
            duration_seconds: duration,
            metadata: {
              stage: 'first_track_ready',
              stage_description: 'First variant ready, generating second',
            },
          };
          
          logger.info(`[suno-webhook] 🎵 First track ready`, {
            taskId,
            audioUrl: audioUrl?.substring(0, 60),
            duration,
          });
        }
        break;
      }
      
      case 'complete': {
        // Все треки готовы (обычно 2)
        if (payload.code !== 200) {
          updateData = {
            status: 'failed',
            error_message: payload.msg,
            progress_percent: 0,
          };
          logger.error(`[suno-webhook] ❌ Generation failed: ${payload.msg}`);
        } else if (items.length > 0) {
          const mainTrack = items[0];
          const audioUrl = mainTrack.audio_url || mainTrack.stream_audio_url || mainTrack.source_audio_url || null;
          const coverUrl = mainTrack.image_url || mainTrack.source_image_url || null;
          const videoUrl = mainTrack.video_url || null;
          const duration = Math.round(mainTrack.duration || 0);
          
          // Извлекаем осмысленное название
          const language = detectLanguage(track.prompt || track.lyrics || '');
          const extractedTitle = extractTitle({
            title: mainTrack.title || track.title,
            lyrics: mainTrack.prompt || track.lyrics,
            prompt: track.prompt,
            language,
          });
          
          updateData = {
            status: 'completed',
            progress_percent: 100,
            audio_url: audioUrl,
            cover_url: coverUrl,
            video_url: videoUrl,
            duration,
            duration_seconds: duration,
            lyrics: mainTrack.prompt || track.lyrics || null,
            title: extractedTitle,
            metadata: {
              stage: 'completed',
              stage_description: 'All variants generated',
              total_variants: items.length,
            },
          };
          
          logger.info(`[suno-webhook] ✅ Generation completed`, {
            taskId,
            title: extractedTitle,
            variantsCount: items.length,
            duration,
          });
        }
        break;
      }
      
      case 'error':
        updateData = {
          status: 'failed',
          error_message: payload.msg,
          progress_percent: 0,
        };
        logger.error(`[suno-webhook] ❌ Error callback: ${payload.msg}`);
        break;
    }

    // Обновляем трек
    const { error: updateError } = await supabaseClient
      .from('tracks')
      .update(updateData)
      .eq('id', track.id);

    if (updateError) {
      logger.error('[suno-webhook] Failed to update track:', { error: updateError });
      return new Response(
        JSON.stringify({ error: 'Failed to update track' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info(`[suno-webhook] Track updated successfully: ${track.id} -> ${updateData.status}`);

    // ✅ Создаём версии треков на этапах 'first' и 'complete'
    if ((callbackType === 'complete' || callbackType === 'first') && items.length > 0) {
      logger.info(`[suno-webhook] 💾 Creating track versions`, {
        stage: callbackType,
        tracksCount: items.length,
        trackId: track.id,
      });
      
      // Считываем существующие версии
      const { data: existingVersions } = await supabaseClient
        .from('track_versions')
        .select('variant_index, suno_id')
        .eq('parent_track_id', track.id);

      const usedIndices = new Set<number>((existingVersions || [])
        .map((v: any) => v.variant_index)
        .filter((n: any) => typeof n === 'number'));
      
      const existingBySunoId = new Map<string, number>();
      (existingVersions || []).forEach((v: any) => {
        if (v.suno_id) existingBySunoId.set(String(v.suno_id), v.variant_index);
      });
      
      for (let i = 0; i < items.length; i++) {
        const versionTrack = items[i];
        
        // Проверяем, существует ли версия с таким suno_id
        const sunoId = versionTrack.id ? String(versionTrack.id) : '';
        if (sunoId && existingBySunoId.has(sunoId)) {
          logger.info(`[suno-webhook] ↪︎ Skip existing version for suno_id=${sunoId}`);
          continue;
        }
        
        // Используем порядковый индекс как variant_index
        const variantIndex = i;
        
        const audioUrl = versionTrack.audio_url || versionTrack.stream_audio_url || versionTrack.source_audio_url || null;
        const coverUrl = versionTrack.image_url || versionTrack.source_image_url || null;
        const videoUrl = versionTrack.video_url || null;
        const duration = Math.round(versionTrack.duration || 0);
        
        // Извлекаем title для версии
        const language = detectLanguage(track.prompt || track.lyrics || '');
        const versionTitle = extractTitle({
          title: versionTrack.title,
          lyrics: versionTrack.prompt || track.lyrics,
          prompt: track.prompt,
          language,
        });
        
        const versionData = {
          parent_track_id: track.id,
          variant_index: variantIndex,
          is_primary_variant: variantIndex === 0,
          is_preferred_variant: variantIndex === 0,
          suno_id: versionTrack.id || null,
          audio_url: audioUrl,
          cover_url: coverUrl,
          video_url: videoUrl,
          lyrics: versionTrack.prompt || track.lyrics || null,
          duration: duration,
          metadata: {
            suno_track_data: versionTrack,
            generated_via: 'webhook',
            suno_task_id: taskId,
            callback_type: callbackType,
            variant_title: versionTitle,
          },
        };

        const { error: versionError } = await supabaseClient
          .from('track_versions')
          .upsert(versionData, {
            onConflict: 'parent_track_id,variant_index',
            ignoreDuplicates: false,
          });

        if (versionError) {
          logger.error(`[suno-webhook] ❌ Failed to create version ${variantIndex}:`, { error: versionError });
        } else {
          logger.info(`[suno-webhook] ✅ Alternate version ${variantIndex} created`, {
            title: versionTitle,
            audioUrl: audioUrl?.substring(0, 60),
            duration,
          });
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

    // =====================================================
    // SEC-002: MARK WEBHOOK AS COMPLETED
    // =====================================================
    await supabaseClient.rpc('complete_webhook_delivery', {
      p_webhook_id: webhookId,
      p_track_id: track.id,
    });

    logger.info(`[suno-webhook] ✅ Webhook completed`, { webhookId, trackId: track.id });

    return new Response(
      JSON.stringify({
        success: true,
        trackId: track.id,
        callbackType: callbackType,
        versionsCreated: items.length,
        code: payload.code,
        webhookId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    logger.error('[suno-webhook] Unexpected error:', { error });

    // =====================================================
    // SEC-002: MARK WEBHOOK AS FAILED
    // =====================================================
    try {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Try to get webhookId from scope (may not be available if error was early)
      const webhookId = req.headers.get('X-Delivery-Id') ||
                        req.headers.get('X-Webhook-Id');

      if (webhookId) {
        await supabaseClient.rpc('fail_webhook_delivery', {
          p_webhook_id: webhookId,
          p_error_message: errorMessage,
        });
      }
    } catch (logError) {
      // Ignore logging errors
      logger.error('[suno-webhook] Failed to log webhook error:', { logError });
    }

    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
