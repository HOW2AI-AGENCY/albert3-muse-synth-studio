/**
 * Prompt DJ Lyria Stream Edge Function
 * WebSocket proxy для Gemini Lyria Live Music API
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

      console.log('[prompt-dj-lyria] Starting WebSocket stream:', sessionId);

      // Upgrade to WebSocket
      const upgrade = req.headers.get('upgrade') || '';
      if (upgrade.toLowerCase() !== 'websocket') {
        return new Response('Expected WebSocket', { status: 426 });
      }

      const { socket, response } = Deno.upgradeWebSocket(req);

      // Connect to Google Gemini Lyria API (example - adjust to actual API)
      // Note: This is a placeholder - actual implementation depends on Gemini Lyria API structure
      socket.onopen = () => {
        console.log('[prompt-dj-lyria] WebSocket opened');
        socket.send(JSON.stringify({ 
          type: 'session.created',
          sessionId 
        }));
      };

      socket.onmessage = async (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('[prompt-dj-lyria] Received message:', message.type);

          // Handle different message types
          if (message.type === 'prompts.update') {
            // Forward weighted prompts to Gemini Lyria
            // This is where you'd integrate with actual Gemini Lyria API
            console.log('[prompt-dj-lyria] Updating prompts:', message.prompts);

            // Simulate audio streaming response
            // In production, this would be actual audio chunks from Gemini Lyria
            socket.send(JSON.stringify({
              type: 'audio.chunk',
              chunk: 'base64_audio_data_here', // Replace with actual audio
              timestamp: Date.now()
            }));
          }
        } catch (error) {
          console.error('[prompt-dj-lyria] Message error:', error);
          socket.send(JSON.stringify({
            type: 'error',
            message: error.message
          }));
        }
      };

      socket.onerror = (error) => {
        console.error('[prompt-dj-lyria] WebSocket error:', error);
      };

      socket.onclose = () => {
        console.log('[prompt-dj-lyria] WebSocket closed');
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

      console.log('[prompt-dj-lyria] Session created:', {
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

      console.log('[prompt-dj-lyria] Updating prompts:', {
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
    console.error('[prompt-dj-lyria] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
