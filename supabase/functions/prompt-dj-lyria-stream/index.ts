/**
 * Prompt DJ Lyria Stream Edge Function
 * WebSocket proxy для Gemini Lyria Live Music API
 *
 * @version 1.0.0
 * @since 2025-11-02
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { logger } from '../_shared/logger.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

interface WeightedPrompt {
  text: string;
  weight: number;
}

interface ConnectRequest {
  initialPrompts: WeightedPrompt[];
}

interface UpdatePromptsRequest {
  sessionId: string;
  prompts: WeightedPrompt[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get('GOOGLE_AI_API_KEY');
    if (!GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY not configured');
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Route: WebSocket stream
    if (path.endsWith('/stream') || url.searchParams.has('sessionId')) {
      const sessionId = url.searchParams.get('sessionId');
      if (!sessionId) {
        return new Response(
          JSON.stringify({ error: 'sessionId required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logger.info('Starting WebSocket stream', { endpoint: 'prompt-dj-lyria', sessionId });

      // Upgrade to WebSocket
      const upgrade = req.headers.get('upgrade') || '';
      if (upgrade.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);

      // Connect to Google Gemini Lyria API (example - adjust to actual API)
      // Note: This is a placeholder - actual implementation depends on Gemini Lyria API structure
      socket.onopen = () => {
        logger.info('WebSocket opened', { endpoint: 'prompt-dj-lyria' });
        socket.send(JSON.stringify({
          type: 'session.created',
          sessionId
        }));
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          logger.info('Received message', { endpoint: 'prompt-dj-lyria', messageType: message.type });

          // Handle different message types
          if (message.type === 'prompts.update') {
            // Forward weighted prompts to Gemini Lyria
            // This is where you'd integrate with actual Gemini Lyria API
            logger.info('Updating prompts', { endpoint: 'prompt-dj-lyria', prompts: message.prompts });

            // Simulate audio streaming response
            // In production, this would be actual audio chunks from Gemini Lyria
            socket.send(JSON.stringify({
              type: 'audio.chunk',
              chunk: 'base64_audio_data_here', // Replace with actual audio
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          logger.error('Message error', error instanceof Error ? error : new Error(String(error)), 'prompt-dj-lyria');
          socket.send(JSON.stringify({
            type: 'error',
            message: error instanceof Error ? error.message : 'Unknown error'
          }));
        }
      };

      socket.onerror = (error) => {
        logger.error('WebSocket error', error instanceof Error ? error : new Error(String(error)), 'prompt-dj-lyria');
      };

      socket.onclose = () => {
        logger.info('WebSocket closed', { endpoint: 'prompt-dj-lyria' });
      };

      return response;
    }

    // Route: Initialize session (default POST request)
    if (req.method === 'POST' && !path.endsWith('/stream') && !path.endsWith('/update-prompts')) {
      const { initialPrompts } = await req.json() as ConnectRequest;

      if (!initialPrompts || !Array.isArray(initialPrompts)) {
        return new Response(
          JSON.stringify({ error: 'Invalid initialPrompts' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const sessionId = crypto.randomUUID();

      logger.info('Session created', {
        endpoint: 'prompt-dj-lyria',
        sessionId,
        promptsCount: initialPrompts.length,
        activePrompts: initialPrompts.filter(p => p.weight > 0).length
      });

      // In production, initialize Gemini Lyria session here

      return new Response(
        JSON.stringify({
          success: true,
          sessionId,
          message: 'Prompt DJ session created'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Route: Update prompts (non-WebSocket)
    if (path.endsWith('/update-prompts')) {
      const { sessionId, prompts } = await req.json() as UpdatePromptsRequest;

      if (!sessionId || !prompts) {
        return new Response(
          JSON.stringify({ error: 'Invalid request' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      logger.info('Updating prompts', {
        endpoint: 'prompt-dj-lyria',
        sessionId,
        promptsCount: prompts.length,
        activePrompts: prompts.filter(p => p.weight > 0).length
      });

      // In production, send prompts to Gemini Lyria

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Prompts updated'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unknown route
    return new Response(
      JSON.stringify({ error: 'Unknown route' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in prompt-dj-lyria', error instanceof Error ? error : new Error(String(error)), 'prompt-dj-lyria');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
