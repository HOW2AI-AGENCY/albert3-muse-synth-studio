/**
 * Generate Project Concept Edge Function
 * Uses Lovable AI to generate comprehensive music project concepts
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateConceptRequest {
  prompt: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt }: GenerateConceptRequest = await req.json();

    if (!prompt || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a professional music project planner and A&R specialist. Generate a complete, detailed, and creative music project concept based on the user's description.

CRITICAL REQUIREMENTS:
1. Output ONLY valid JSON (no markdown, no explanations, no code blocks)
2. Generate EXACTLY 10-12 planned tracks with detailed descriptions
3. Fill ALL fields completely and professionally
4. Be creative, artistic, and industry-standard
5. Each track must have a unique concept and purpose within the album

DETAILED FIELD REQUIREMENTS:

**name**: Creative album/project name (5-50 characters)
  - Should be memorable, evocative, and match the genre/mood
  - Examples: "Neon Dreams", "Whispers in the Dark", "Electric Horizons"

**genre**: Primary genre (be specific)
  - Examples: "Synthwave", "Indie Rock", "Lo-Fi Hip Hop", "Deep House", "Alternative Pop"

**mood**: Overall emotional tone
  - Examples: "Melancholic & Introspective", "Energetic & Uplifting", "Dark & Atmospheric", "Dreamy & Nostalgic"

**style_tags**: 5-8 specific style descriptors
  - Include production style, subgenres, influences, sonic characteristics
  - Examples: ["retro synths", "808 drums", "dreamy vocals", "analog warmth", "cinematic"]

**concept_description**: Detailed artistic vision (150-250 words)
  - Describe the overall theme, story, or concept
  - Include sonic palette, production approach
  - Explain the emotional journey
  - Reference influences or similar artists if relevant

**story_theme**: Central narrative or thematic thread (50-100 words)
  - What story does the album tell?
  - What journey does the listener go on?
  - What emotions or ideas are explored?

**tempo_range**: Realistic BPM range for the genre
  - { "min": 80, "max": 140 } for example
  - Should match the genre conventions

**planned_tracks**: Array of 10-12 tracks, each with:
  - **order**: Track number (1-12)
  - **title**: Creative, evocative track name (3-60 characters)
  - **duration_target**: Duration in seconds (180-360)
    * Intro/Outro: 90-180 seconds
    * Standard tracks: 180-300 seconds
    * Epic/Finale: 300-420 seconds
  - **notes**: DETAILED description (100-200 words) including:
    * Track's role in the album narrative
    * Mood and emotional tone
    * Key musical elements (instruments, production techniques)
    * Tempo and energy level
    * Lyrical themes or vocal approach (if applicable)
    * Production style and sound design
    * How it transitions from/to other tracks

EXAMPLE TRACK NOTES:
"Opening track that sets the album's nostalgic, late-night atmosphere. Features warm analog synths layered over a steady 85 BPM groove with crispy 808 drums. Ethereal vocals float above the mix, telling the story of urban isolation. The production emphasizes space and reverb, creating a cinematic soundscape. Builds gradually from minimal intro to full arrangement by 2:00 mark. Perfect gateway into the album's sonic world."

Output format:
{
  "name": "Album Name",
  "genre": "Specific Genre Name",
  "mood": "Detailed Mood Description",
  "style_tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "concept_description": "Comprehensive 150-250 word artistic vision and concept...",
  "story_theme": "Detailed 50-100 word narrative theme...",
  "tempo_range": { "min": 80, "max": 130 },
  "planned_tracks": [
    {
      "order": 1,
      "title": "Track Title",
      "duration_target": 240,
      "notes": "Detailed 100-200 word description of track's role, mood, instruments, production, themes..."
    }
  ]
}`;

    console.log(`Generating project concept for prompt: "${prompt}"`);

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
          { 
            role: 'user', 
            content: `Generate a detailed, professional music project concept based on this description:\n\n${prompt}\n\nBe creative, artistic, and thorough. Fill all fields with rich, detailed information. Each track should have a unique concept and detailed notes (100-200 words each).` 
          }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI generation failed', details: errorText }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid AI response format:', data);
      return new Response(
        JSON.stringify({ error: 'Invalid AI response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const content = JSON.parse(data.choices[0].message.content);
    
    // Validate response structure
    if (!content.name || !content.planned_tracks || !Array.isArray(content.planned_tracks)) {
      console.error('Invalid content structure:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid project concept structure' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Project concept generated: "${content.name}" with ${content.planned_tracks.length} tracks`);

    return new Response(
      JSON.stringify(content),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-project-concept:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
