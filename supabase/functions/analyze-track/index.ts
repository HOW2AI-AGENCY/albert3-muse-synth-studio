import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders()
};

const mainHandler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, lyrics, tags } = await req.json();

    if (!prompt && !lyrics) {
      return new Response(
        JSON.stringify({ error: 'Prompt or lyrics required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const analysisPrompt = `Analyze this music content and provide structured metadata:

${prompt ? `Prompt: ${prompt}` : ''}
${lyrics ? `Lyrics: ${lyrics}` : ''}
${tags ? `Tags: ${tags.join(', ')}` : ''}

Please provide:
1. Genre classification (main genre and subgenres)
2. Mood and emotional tone
3. Energy level (1-10)
4. Tempo estimate (BPM range)
5. Instrumentation suggestions
6. Target audience
7. Similar artists or tracks
8. Recommended tags for discoverability

Format the response as JSON with these fields:
{
  "genre": { "main": "", "subgenres": [] },
  "mood": [],
  "energy": 0,
  "tempo": { "min": 0, "max": 0 },
  "instruments": [],
  "audience": "",
  "similarTo": [],
  "tags": []
}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a professional music analyst and metadata expert. Analyze music content and provide structured, accurate metadata in JSON format.'
          },
          {
            role: 'user',
            content: analysisPrompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices?.[0]?.message?.content;

    if (!analysisText) {
      throw new Error('No response from AI');
    }

    // Try to parse JSON from response
    let analysis;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = analysisText.match(/```json\n([\s\S]*?)\n```/) || 
                       analysisText.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : analysisText;
      analysis = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', analysisText);
      analysis = { raw: analysisText };
    }

    return new Response(
      JSON.stringify({ analysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-track:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

const handler = withRateLimit(mainHandler, {
  maxRequests: 30,
  windowMs: 60000,
  keyGenerator: (req) => {
    const authHeader = req.headers.get('Authorization');
    return authHeader ? `analyze_${authHeader.split(' ')[1]?.substring(0, 10)}` : 'anonymous';
  }
});

serve(handler);
