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

    const systemPrompt = `You are a professional music project planner AI. Generate a complete and creative music project concept based on user's description.

CRITICAL REQUIREMENTS:
1. Output ONLY valid JSON (no markdown, no explanations)
2. Generate EXACTLY 10 planned tracks
3. Each track must have: order (1-10), title, duration_target (in seconds, 180-300), and notes
4. Be creative but realistic
5. Match the user's desired genre and mood

Output format:
{
  "name": "Project Name",
  "genre": "Genre",
  "mood": "Mood",
  "style_tags": ["tag1", "tag2", "tag3"],
  "concept_description": "Detailed concept description (100-150 words)",
  "story_theme": "Central theme/story",
  "tempo_range": { "min": 80, "max": 120 },
  "planned_tracks": [
    {
      "order": 1,
      "title": "Track Name",
      "duration_target": 240,
      "notes": "Brief description of mood/style/purpose"
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
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9,
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
