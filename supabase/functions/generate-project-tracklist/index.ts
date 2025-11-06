import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { logger } from "../_shared/logger.ts";

serve(async (req) => {
  const corsHeaders = {
    ...createCorsHeaders(req),
    ...createSecurityHeaders()
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const bearerToken = authHeader.replace(/^Bearer\s+/i, '');

    // Admin client for secure DB operations (RLS bypass after we verify the token)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Decode JWT locally to extract user id (avoid session-dependent getUser())
    const parts = bearerToken.split('.');
    if (parts.length !== 3) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    let decoded: any;
    try {
      const json = atob(base64);
      decoded = JSON.parse(json);
    } catch (e) {
      logger.error('JWT decode failed', e instanceof Error ? e : new Error(String(e)), 'generate-project-tracklist');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = decoded?.sub || decoded?.user_id;
    const exp = decoded?.exp ? Number(decoded.exp) : null;
    if (!userId || (exp && Date.now() / 1000 > exp)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
      user_id: userId,
      project_id: projectId,
      title: track.title,
      prompt: track.prompt,
      style_tags: track.style_tags,
      genre: genre || null,
      mood: mood || null,
      status: 'pending',
      provider: 'suno',
    }));

    const { data: insertedTracks, error: insertError } = await supabaseAdmin
      .from('tracks')
      .insert(tracksToInsert)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
      throw insertError;
    }

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
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'Unauthorized' || message === 'Missing authorization header' ? 401 : 500;
    return new Response(
      JSON.stringify({ error: message }),
      { 
        status, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
