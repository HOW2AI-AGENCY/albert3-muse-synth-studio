/**
 * Unified Generate Music Callback Handler (generate-music-callb)
 * 
 * Обрабатывает Suno API callbacks и обеспечивает:
 * - Немедленное воспроизведение первой версии (stream/audio URL)
 * - Фоновую загрузку всех версий в Supabase Storage
 * - Кеширование версий на 30 минут
 * - Финализацию статуса на этапе COMPLETE
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { processSunoCallback } from "../_shared/callback-processor.ts";
import type { SunoCallbackPayload } from "../_shared/types/callbacks.ts";
import { createCacheHeaders } from "../_shared/cache.ts";

const corsHeaders = createCorsHeaders({} as Request);

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createSupabaseAdminClient();

    // Валидация контента
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      logger.warn('[GENERATE-MUSIC-CALLB] Invalid content-type', { contentType });
      return new Response(JSON.stringify({ ok: false, error: 'invalid_content_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const payload: SunoCallbackPayload = await req.json();
    logger.info('[GENERATE-MUSIC-CALLB] Callback received', { preview: JSON.stringify(payload).substring(0, 500) });

    // Идемпотентность вебхуков: сформируем уникальный webhookId
    const headerWebhookId = req.headers.get('x-delivery-id')
      || req.headers.get('x-webhook-id')
      || undefined;

    const taskId = payload?.data?.task_id || 'unknown';
    const stage = payload?.data?.callbackType || 'unknown';
    const webhookId = headerWebhookId || `suno:${taskId}:${stage}`;

    // Проверим, обрабатывался ли уже этот вебхук
    const { data: alreadyProcessed, error: checkErr } = await supabase.rpc('check_webhook_processed', {
      p_webhook_id: webhookId,
    });
    if (checkErr) {
      logger.error('[GENERATE-MUSIC-CALLB] Idempotency check failed', { webhookId, error: checkErr });
    }
    if (alreadyProcessed) {
      logger.info('[GENERATE-MUSIC-CALLB] Duplicate webhook ignored', { webhookId });
      return new Response(JSON.stringify({ ok: true, idempotent: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', ...createCacheHeaders({ maxAge: 30, public: false }) },
      });
    }

    // Зарегистрируем доставку вебхука
    const { error: regErr } = await supabase.rpc('register_webhook_delivery', {
      p_webhook_id: webhookId,
      p_provider: 'suno',
      p_task_id: taskId,
      p_track_id: null,
      p_payload: payload as unknown as Record<string, unknown>,
    });
    if (regErr) {
      logger.error('[GENERATE-MUSIC-CALLB] Failed to register webhook delivery', { webhookId, error: regErr });
    }

    const result = await processSunoCallback(supabase, payload);

    if (!result.ok && result.error === 'track_not_found') {
      // Возвращаем 202 Accepted → провайдер может повторить callback позже
      // Зафиксируем неуспешную обработку (для повторов от провайдера)
      await supabase.rpc('fail_webhook_delivery', {
        p_webhook_id: webhookId,
        p_error_message: 'track_not_found',
      }).catch(() => undefined);

      return new Response(JSON.stringify({ ok: false, retryable: true, error: 'track_not_found' }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', ...createCacheHeaders({ maxAge: 10, public: false }) },
      });
    }

    if (!result.ok) {
      await supabase.rpc('fail_webhook_delivery', {
        p_webhook_id: webhookId,
        p_error_message: result.error || 'unknown_error',
      }).catch(() => undefined);
      return new Response(JSON.stringify({ ok: false, error: result.error }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Успешная обработка — отметим завершение
    await supabase.rpc('complete_webhook_delivery', {
      p_webhook_id: webhookId,
      p_track_id: result.trackId || null,
    }).catch(() => undefined);

    return new Response(JSON.stringify({ ok: true, trackId: result.trackId, stage: result.stage, cached: result.cached }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json', ...createCacheHeaders({ maxAge: 30, public: false }) },
    });
  } catch (error) {
    logger.error('[GENERATE-MUSIC-CALLB] Handler error', { error });
    return new Response(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});