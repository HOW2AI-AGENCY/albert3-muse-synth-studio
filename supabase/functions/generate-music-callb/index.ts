/**
 * Unified Generate Music Callback Handler (generate-music-callb)
 * 
 * Обрабатывает Suno API callbacks и обеспечивает:
 * - Немедленное воспроизведение первой версии (stream/audio URL)
 * - Фоновую загрузку всех версий в Supabase Storage
 * - Кеширование версий на 30 минут
 * - Финализацию статуса на этапе COMPLETE
 */

import { serve } from "https://deno.land/std/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { processSunoCallback } from "../_shared/callback-processor.ts";
import type { SunoCallbackPayload } from "../_shared/types/callbacks.ts";
import { createCacheHeaders } from "../_shared/cache.ts";
import { verifyWebhookSignature } from "../_shared/webhook-verify.ts";

// corsHeaders формируются внутри обработчика на основе req

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = createCorsHeaders(req);
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

    // Проверка подписи вебхука (если установлен секрет)
    const signature = req.headers.get('X-Suno-Signature');
    const SUNO_WEBHOOK_SECRET = (globalThis as any).Deno?.env?.get('SUNO_WEBHOOK_SECRET');

    let payload: SunoCallbackPayload;
    if (SUNO_WEBHOOK_SECRET) {
      if (!signature) {
        logger.error('[GENERATE-MUSIC-CALLB] Missing webhook signature');
        return new Response(JSON.stringify({ ok: false, error: 'missing_signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const rawBody = await req.text();
      const valid = await verifyWebhookSignature(rawBody, signature, SUNO_WEBHOOK_SECRET);
      if (!valid) {
        logger.error('[GENERATE-MUSIC-CALLB] Invalid webhook signature');
        return new Response(JSON.stringify({ ok: false, error: 'invalid_signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      try {
        payload = JSON.parse(rawBody) as SunoCallbackPayload;
      } catch (e) {
        logger.error('[GENERATE-MUSIC-CALLB] Invalid JSON body', { e });
        return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    } else {
      payload = await req.json();
    }

    logger.info('[GENERATE-MUSIC-CALLB] Callback received', {
      taskId: payload?.data?.task_id,
      stage: payload?.data?.callbackType,
      preview: JSON.stringify(payload).substring(0, 500)
    });

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
      // Не помечаем доставку как failed (временная ситуация)
      logger.warn('[GENERATE-MUSIC-CALLB] Track not found; acknowledging for retry', { taskId, stage, webhookId });
      return new Response(JSON.stringify({ ok: false, retryable: true, error: 'track_not_found' }), {
        status: 202,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', ...createCacheHeaders({ maxAge: 10, public: false }) },
      });
    }

    if (!result.ok) {
      const err = result.error || 'unknown_error';
      const status = err === 'missing_task_id' ? 400 : 500;
      await supabase.rpc('fail_webhook_delivery', {
        p_webhook_id: webhookId,
        p_error_message: err,
      }).catch(() => undefined);
      logger.error('[GENERATE-MUSIC-CALLB] Processing failed', { taskId, stage, webhookId, error: err, httpStatus: status });
      return new Response(JSON.stringify({ ok: false, error: err }), {
        status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Успешная обработка — отметим завершение
    await supabase.rpc('complete_webhook_delivery', {
      p_webhook_id: webhookId,
      p_track_id: result.trackId || null,
    }).catch(() => undefined);

    logger.info('[GENERATE-MUSIC-CALLB] Processing complete', { taskId, stage, webhookId, trackId: result.trackId, cached: result.cached });
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