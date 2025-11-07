import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { logger } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdatePromptsRequest {
  sessionId: string;
  prompts: Array<{ text: string; weight: number }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, prompts } = await req.json() as UpdatePromptsRequest;

    // Валидация
    if (!sessionId || !prompts || !Array.isArray(prompts)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Updating prompts', {
      endpoint: 'prompt-dj-update-prompts',
      sessionId,
      promptsCount: prompts.length,
      activePrompts: prompts.filter(p => p.weight > 0).length
    });

    // В production здесь бы отправлялись обновленные веса в Gemini Lyria API
    // Для MVP возвращаем успешный результат
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Prompts updated'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in prompt-dj-update-prompts', error instanceof Error ? error : new Error(String(error)), 'prompt-dj-update-prompts');
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
