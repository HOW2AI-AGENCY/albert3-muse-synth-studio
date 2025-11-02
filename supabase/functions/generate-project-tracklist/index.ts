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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Verify user
    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: authHeader },
    });

    if (!userResponse.ok) {
      throw new Error('Unauthorized');
    }

    const user = await userResponse.json();

    const { projectId, projectName, description, genre, mood, projectType, totalTracks } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Generating tracklist for project:', projectName);

    // AI prompt
    const aiPrompt = `Ты музыкальный продюсер. Создай детальный треклист для ${projectType || 'альбома'} "${projectName}".

Контекст проекта:
${description ? `Описание: ${description}` : ''}
${genre ? `Жанр: ${genre}` : ''}
${mood ? `Настроение: ${mood}` : ''}
Количество треков: ${totalTracks || 10}

Для КАЖДОГО трека создай:
1. Название (title) - креативное и соответствующее концепции
2. Промпт для AI-генерации (prompt) - детальное описание звучания, инструментов, настроения (минимум 50 слов)
3. Теги стилей (style_tags) - массив из 3-5 тегов

ОБЯЗАТЕЛЬНО верни ТОЛЬКО валидный JSON без дополнительного текста в формате:
{
  "tracks": [
    {
      "title": "Название трека",
      "prompt": "Детальный промпт для генерации музыки с описанием инструментов, ритма, настроения и звучания",
      "style_tags": ["тег1", "тег2", "тег3"]
    }
  ]
}`;

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'Ты эксперт по созданию музыкальных проектов. Возвращай только валидный JSON.' },
          { role: 'user', content: aiPrompt }
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    // Extract JSON from markdown if needed
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    const tracklist = JSON.parse(content);

    if (!tracklist.tracks || !Array.isArray(tracklist.tracks)) {
      throw new Error('Invalid tracklist format');
    }

    console.log(`Creating ${tracklist.tracks.length} tracks in database`);

    // Create tracks in DB
    const tracksToInsert = tracklist.tracks.map((track: any) => ({
      user_id: user.id,
      project_id: projectId,
      title: track.title,
      prompt: track.prompt,
      style_tags: track.style_tags,
      genre: genre || null,
      mood: mood || null,
      status: 'pending',
      provider: 'suno',
    }));

    const insertResponse = await fetch(`${supabaseUrl}/rest/v1/tracks`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'apikey': supabaseKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify(tracksToInsert),
    });

    if (!insertResponse.ok) {
      const errorText = await insertResponse.text();
      console.error('Insert error:', errorText);
      throw new Error('Failed to insert tracks');
    }

    const insertedTracks = await insertResponse.json();

    console.log(`Successfully created ${insertedTracks.length} tracks`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tracks: insertedTracks,
        count: insertedTracks.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
