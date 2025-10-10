import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders, handleCorsPreflightRequest, createCorsResponse } from "../_shared/cors.ts";
import { logger, withSentry } from "../_shared/logger.ts";

type ClientLogLevel = 'debug' | 'info' | 'warn' | 'error';

interface ClientLogPayload {
  level?: ClientLogLevel;
  message?: string;
  timestamp?: string;
  context?: Record<string, unknown> | null;
  data?: unknown;
  error?: unknown;
  environment?: string | null;
  userAgent?: string | null;
  url?: string | null;
}

const isValidLevel = (lvl: unknown): lvl is ClientLogLevel => (
  lvl === 'debug' || lvl === 'info' || lvl === 'warn' || lvl === 'error'
);

export const mainHandler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = createCorsHeaders(req);

  if (req.method !== 'POST') {
    return createCorsResponse(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      request: req,
    });
  }

  try {
    const payload = await req.json().catch(() => null) as ClientLogPayload | null;
    if (!payload || typeof payload !== 'object') {
      return createCorsResponse(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        request: req,
      });
    }

    const level: ClientLogLevel = isValidLevel(payload.level) ? payload.level : 'error';
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';
    if (!message) {
      return createCorsResponse(JSON.stringify({ error: 'Field "message" is required' }), {
        status: 400,
        request: req,
      });
    }

    const ua = payload.userAgent ?? req.headers.get('user-agent') ?? null;
    const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null;
    const environment = payload.environment ?? req.headers.get('x-app-environment') ?? null;

    const context: Record<string, unknown> = {
      ...(payload.context ?? {}),
      data: payload.data,
      error: payload.error,
      client: {
        userAgent: ua,
        ip,
        url: payload.url ?? null,
        environment,
      },
      receivedAt: new Date().toISOString(),
      sentAt: payload.timestamp ?? null,
    };

    switch (level) {
      case 'error':
        logger.error(message, context);
        break;
      case 'warn':
        logger.warn(message, context);
        break;
      case 'info':
        logger.info(message, context);
        break;
      default:
        logger.debug(message, context);
        break;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    logger.error('log-error: failed to handle client log', { error: err });
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  }
};

export const handler = withSentry(mainHandler, { transaction: 'log-error' });

if (import.meta.main) {
  serve(handler);
}