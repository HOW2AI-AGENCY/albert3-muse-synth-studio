/**
 * Prompt DJ Lyria Stream Edge Function
 * WebSocket proxy для Gemini Lyria Live Music API
 *
 * @version 2.0.0
 * @since 2025-11-17
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { logger } from '../_shared/logger.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';

const corsHeaders = createCorsHeaders();
const securityHeaders = createSecurityHeaders();

// Хранилище сессий в памяти. Ключ - sessionId, значение - WebSocket к Google API.
const sessions = new Map<string, WebSocket>();

const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
const LYRIA_WS_ENDPOINT = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateMusic?key=${GOOGLE_AI_API_KEY}`;
const LYRIA_MODEL = 'models/lyria-realtime-exp';

/**
 * Обрабатывает входящие WebSocket-соединения от клиента.
 */
async function handleWebSocket(req: Request, sessionId: string): Promise<Response> {
  const upgrade = req.headers.get('upgrade') || '';
  if (upgrade.toLowerCase() !== 'websocket') {
    return new Response('Expected WebSocket', { status: 426 });
  }

  const { socket: clientSocket, response } = Deno.upgradeWebSocket(req);

  if (!GOOGLE_AI_API_KEY) {
    logger.error('Missing GOOGLE_AI_API_KEY', undefined, 'prompt-dj-lyria');
    clientSocket.onopen = () => {
      clientSocket.send(JSON.stringify({ type: 'error', message: 'Server configuration error.' }));
      clientSocket.close(1011, 'Server configuration error.');
    };
    return response;
  }

  logger.info('Client attempting to connect', { sessionId });

  const googleSocket = new WebSocket(LYRIA_WS_ENDPOINT);
  sessions.set(sessionId, googleSocket);

  googleSocket.onopen = () => {
    logger.info('Connection to Google Lyria API established', { sessionId });
    // 1. Отправляем конфигурацию сессии в Google
    googleSocket.send(JSON.stringify({
      setup: { model: LYRIA_MODEL }
    }));
  };

  // 2. Перенаправляем сообщения от Google клиенту
  googleSocket.onmessage = (event) => {
    const message = JSON.parse(event.data);

    // Преобразуем ответ от Google в наш внутренний формат
    if (message.serverContent?.audioChunks) {
      const audioChunk = message.serverContent.audioChunks[0];
      clientSocket.send(JSON.stringify({
        type: 'audio.chunk',
        chunk: audioChunk.data, // Предполагается, что данные уже в base64
      }));
    } else if (message.setupComplete) {
        logger.info('Google Lyria setup complete', { sessionId });
        clientSocket.send(JSON.stringify({ type: 'session.created', sessionId }));
    } else {
        logger.info('Received non-audio message from Google', { sessionId, message });
        clientSocket.send(JSON.stringify({ type: 'info', payload: message }));
    }
  };

  googleSocket.onerror = (error) => {
    logger.error('Google Lyria WebSocket error', error, 'prompt-dj-lyria');
    clientSocket.send(JSON.stringify({ type: 'error', message: 'Connection to music service failed.' }));
  };

  googleSocket.onclose = () => {
    logger.info('Connection to Google Lyria closed', { sessionId });
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.close(1000, 'Upstream service disconnected.');
    }
    sessions.delete(sessionId);
  };

  // 3. Перенаправляем сообщения от клиента в Google
  clientSocket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    logger.info('Received message from client', { sessionId, messageType: message.type });

    if (googleSocket.readyState !== WebSocket.OPEN) {
        logger.warn('Trying to send message to closed Google socket', { sessionId });
        return;
    }

    if (message.type === 'prompts.update') {
      googleSocket.send(JSON.stringify({
        clientContent: {
          weightedPrompts: message.prompts,
        },
      }));
    } else if (message.type === 'playback.control') { // e.g., 'PLAY', 'PAUSE'
        googleSocket.send(JSON.stringify({
            playbackControl: message.command
        }));
    } else if (message.type === 'reference.update') {
        // Логика для отправки референсного аудио (если потребуется)
        // googleSocket.send(...)
    }
  };

  clientSocket.onclose = () => {
    logger.info('Client disconnected', { sessionId });
    if (googleSocket.readyState === WebSocket.OPEN) {
      googleSocket.close();
    }
    sessions.delete(sessionId);
  };

  clientSocket.onerror = (error) => {
    logger.error('Client WebSocket error', error, 'prompt-dj-lyria');
    if (googleSocket.readyState === WebSocket.OPEN) {
      googleSocket.close();
    }
  };

  return response;
}

/**
 * Инициирует сессию и возвращает sessionId.
 */
async function handleSessionInit(req: Request): Promise<Response> {
  const { initialPrompts } = await req.json();

  if (!initialPrompts || !Array.isArray(initialPrompts)) {
    return new Response(JSON.stringify({ error: 'Invalid initialPrompts' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const sessionId = crypto.randomUUID();
  logger.info('Session created', { sessionId, promptsCount: initialPrompts.length });

  // Примечание: WebSocket соединение с Google будет установлено только
  // когда клиент подключится к /stream с этим sessionId.

  return new Response(JSON.stringify({ success: true, sessionId }), {
    headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (sessionId) {
      return await handleWebSocket(req, sessionId);
    }

    if (req.method === 'POST') {
      return await handleSessionInit(req);
    }

    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    logger.error('Unhandled error in prompt-dj-lyria', error, 'prompt-dj-lyria');
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
