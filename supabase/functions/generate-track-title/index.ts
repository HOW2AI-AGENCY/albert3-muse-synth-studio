import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lyrics, prompt } = await req.json();
    
    if (!lyrics && !prompt) {
      logger.error('No lyrics or prompt provided');
      return new Response(
        JSON.stringify({ error: 'Требуется текст лирики или промпт' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      logger.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI сервис не настроен' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = lyrics || prompt;
    const systemPrompt = `Ты - профессиональный копирайтер для музыкальной индустрии.
Твоя задача - создать короткое, запоминающееся название песни на русском языке (до 50 символов).
Название должно отражать суть песни, быть эмоциональным и привлекательным.
Верни ТОЛЬКО название, без кавычек, точек и дополнительных символов.`;

    const userPrompt = `Проанализируй текст песни и создай для неё название:

${content.slice(0, 500)}

Название (на русском, до 50 символов):`;

    logger.info('Generating track title with Lovable AI', { contentLength: content.length });

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI error', { status: response.status, error: errorText });
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Превышен лимит запросов AI. Попробуйте позже.' }), 
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Недостаточно средств для AI генерации.' }), 
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Fallback при ошибках AI
      const fallbackTitle = generateFallbackTitle(content);
      logger.warn('Using fallback title generation', { fallbackTitle });
      return new Response(
        JSON.stringify({ title: fallbackTitle, source: 'fallback' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    let title = data.choices?.[0]?.message?.content?.trim() || '';
    
    // Очистка названия от возможных артефактов
    title = title
      .replace(/^["'«»]/g, '')
      .replace(/["'«»]$/g, '')
      .replace(/[.!?]$/g, '')
      .trim();
    
    // Ограничение длины
    if (title.length > 50) {
      title = title.slice(0, 47) + '...';
    }
    
    // Если AI вернул пустое название - используем fallback
    if (!title) {
      title = generateFallbackTitle(content);
      logger.warn('AI returned empty title, using fallback', { fallbackTitle: title });
    }

    logger.info('Track title generated successfully', { title });

    return new Response(
      JSON.stringify({ title, source: 'ai' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in generate-track-title', { error });
    
    // Fallback при неожиданных ошибках
    const fallbackTitle = generateFallbackTitle('');
    return new Response(
      JSON.stringify({ title: fallbackTitle, source: 'error-fallback' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackTitle(content: string): string {
  if (content) {
    // Берём первые 3-5 слов из контента
    const words = content
      .replace(/\[.*?\]/g, '') // Убираем теги
      .trim()
      .split(/\s+/)
      .filter(w => w.length > 2) // Только слова длиннее 2 символов
      .slice(0, 5);
    
    if (words.length > 0) {
      const title = words.join(' ');
      return title.length > 50 ? title.slice(0, 47) + '...' : title;
    }
  }
  
  // Последний fallback с временной меткой
  const timestamp = new Date().toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  return `Трек ${timestamp}`;
}
