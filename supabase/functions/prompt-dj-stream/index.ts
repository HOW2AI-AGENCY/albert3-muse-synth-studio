import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { logger } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Starting SSE stream', { endpoint: 'prompt-dj-stream', sessionId });

    // Создаем SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        // Отправляем keepalive каждые 30 секунд
        const keepaliveInterval = setInterval(() => {
          controller.enqueue(encoder.encode(': keepalive\n\n'));
        }, 30000);

        // В production здесь бы читались данные из Gemini Lyria API
        // и отправлялись как SSE события:
        // 
        // const event = `data: ${JSON.stringify({
        //   type: 'audio-chunk',
        //   chunk: base64AudioData
        // })}\n\n`;
        // controller.enqueue(encoder.encode(event));

        // Cleanup при закрытии
        req.signal.addEventListener('abort', () => {
          clearInterval(keepaliveInterval);
          controller.close();
        });
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error) {
    logger.error('Error in prompt-dj-stream', error instanceof Error ? error : new Error(String(error)), 'prompt-dj-stream');
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
