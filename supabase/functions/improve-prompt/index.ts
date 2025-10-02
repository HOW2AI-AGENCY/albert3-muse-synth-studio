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

    const { prompt } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

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
            content: `You are a professional music prompt engineer. Your task is to enhance user's music descriptions to be more detailed, specific, and suitable for AI music generation.

Include details about:
- Genre and style
- Instruments and sounds
- Tempo and rhythm
- Mood and atmosphere
- Musical structure (if relevant)
- Production quality/style

Keep the improved prompt concise (2-4 sentences) but highly descriptive. Focus on musical elements that AI can translate into sound.`
          },
          {
            role: 'user',
            content: `Improve this music description for AI generation: "${prompt}"`
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
    const improvedPrompt = data.choices?.[0]?.message?.content;

    if (!improvedPrompt) {
      throw new Error('No response from AI');
    }

    return new Response(
      JSON.stringify({ improvedPrompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in improve-prompt:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

const handler = withRateLimit(mainHandler, {
  maxRequests: 20,
  windowMs: 60000, // 1 minute
  keyGenerator: (req) => {
    const authHeader = req.headers.get('Authorization');
    return authHeader ? `prompt_${authHeader.split(' ')[1]?.substring(0, 10)}` : 'anonymous';
  }
});

serve(handler);
