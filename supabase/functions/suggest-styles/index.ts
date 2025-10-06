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

    const { mood, genre, context, currentTags } = await req.json();

    if (!mood && !genre && !context) {
      return new Response(
        JSON.stringify({ error: 'At least one parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const suggestionPrompt = `Based on the following music preferences, suggest specific style tags and musical elements:

${mood ? `Desired Mood: ${mood}` : ''}
${genre ? `Genre: ${genre}` : ''}
${context ? `Context/Use Case: ${context}` : ''}
${currentTags ? `Current Tags: ${currentTags.join(', ')}` : ''}

Please suggest:
1. 5-10 specific style tags (e.g., "lo-fi", "ambient", "synthwave", "trap beats")
2. Instrument recommendations
3. Production techniques or effects
4. Vocal style suggestions (if applicable)
5. Reference tracks or artists that match this style

Format as JSON:
{
  "tags": [],
  "instruments": [],
  "techniques": [],
  "vocalStyle": "",
  "references": []
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
            content: 'You are a music production expert and style consultant. Suggest specific, actionable style elements for music creation.'
          },
          {
            role: 'user',
            content: suggestionPrompt
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
    const suggestionText = data.choices?.[0]?.message?.content;

    if (!suggestionText) {
      throw new Error('No response from AI');
    }

    // Try to parse JSON from response
    let suggestions;
    try {
      const jsonMatch = suggestionText.match(/```json\n([\s\S]*?)\n```/) || 
                       suggestionText.match(/```\n([\s\S]*?)\n```/);
      const jsonText = jsonMatch ? jsonMatch[1] : suggestionText;
      suggestions = JSON.parse(jsonText);
    } catch (e) {
      console.error('Failed to parse AI response as JSON:', suggestionText);
      suggestions = { raw: suggestionText };
    }

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in suggest-styles:', error);
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
    return authHeader ? `suggest_${authHeader.split(' ')[1]?.substring(0, 10)}` : 'anonymous';
  }
});

serve(handler);
