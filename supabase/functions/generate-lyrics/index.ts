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
    const { theme, mood, genre, language = 'ru', structure = 'verse-chorus-verse-chorus-bridge-chorus' } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log('Generating lyrics with params:', { theme, mood, genre, language, structure });

    const systemPrompt = `Ты профессиональный автор песен. Создавай креативные, эмоциональные и запоминающиеся тексты песен.
    
Правила:
- Используй структуру: ${structure}
- Язык: ${language === 'ru' ? 'русский' : 'английский'}
- Каждая секция должна быть помечена [Verse], [Chorus], [Bridge]
- Текст должен быть ритмичным и подходить для пения
- Избегай клише, будь креативным
- Используй метафоры и образы
- Длина куплета: 4-6 строк
- Длина припева: 2-4 строки`;

    const userPrompt = `Напиши текст песни:
Тема: ${theme}
Настроение: ${mood}
Жанр: ${genre}

Создай полноценный текст песни с указанными секциями.`;

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
        temperature: 0.9,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI generation failed: ${response.status}`);
    }

    const data = await response.json();
    const generatedLyrics = data.choices[0].message.content;

    console.log('Lyrics generated successfully');

    return new Response(
      JSON.stringify({ 
        lyrics: generatedLyrics,
        metadata: { theme, mood, genre, language, structure }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in generate-lyrics function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
