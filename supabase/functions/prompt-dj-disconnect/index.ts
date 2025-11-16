import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { logger } from '../_shared/logger.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

interface DisconnectRequest {
  sessionId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json() as DisconnectRequest;

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'sessionId required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Disconnecting session', { endpoint: 'prompt-dj-disconnect', sessionId });

    // В production здесь бы закрывалось соединение с Gemini Lyria API
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Session closed'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in prompt-dj-disconnect', error instanceof Error ? error : new Error(String(error)), 'prompt-dj-disconnect');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
