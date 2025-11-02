import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      projectName, 
      projectDescription, 
      projectGenre, 
      projectMood,
      trackTitle,
      trackStylePrompt 
    } = await req.json();

    if (!trackTitle && !trackStylePrompt) {
      return new Response(
        JSON.stringify({ error: 'Требуется название трека или описание стиля' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Формируем системный промпт
    const systemPrompt = `Ты - профессиональный автор текстов песен и музыкальный консультант. 
Твоя задача - создать детальный промпт для генерации лирики песни на основе контекста музыкального проекта и описания трека.

Важно:
- Определи язык контекста (русский, английский и т.д.) и пиши промпт на том же языке
- Промпт должен быть кратким, но содержательным (50-150 слов)
- Укажи настроение, тему, структуру песни
- Используй информацию о жанре и стиле
- НЕ пиши саму лирику, только промпт для её генерации`;

    // Формируем пользовательский промпт
    const contextParts = [];
    
    if (projectName) contextParts.push(`Проект: "${projectName}"`);
    if (projectDescription) contextParts.push(`Описание: ${projectDescription}`);
    if (projectGenre) contextParts.push(`Жанр: ${projectGenre}`);
    if (projectMood) contextParts.push(`Настроение: ${projectMood}`);
    if (trackTitle) contextParts.push(`Название трека: "${trackTitle}"`);
    if (trackStylePrompt) contextParts.push(`Стиль трека: ${trackStylePrompt}`);

    const userPrompt = `Контекст:\n${contextParts.join('\n')}\n\nСоздай промпт для генерации лирики этой песни. Промпт должен быть на том же языке, что и контекст выше.`;

    console.log('Generating lyrics prompt with context:', { projectName, trackTitle });

    // Вызываем Lovable AI
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
        temperature: 0.7,
        max_tokens: 300
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Превышен лимит запросов. Попробуйте позже.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Недостаточно кредитов. Пополните баланс.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedPrompt = data.choices[0]?.message?.content;

    if (!generatedPrompt) {
      throw new Error('No prompt generated');
    }

    console.log('Generated lyrics prompt successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        prompt: generatedPrompt.trim()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating lyrics prompt:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate prompt'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
