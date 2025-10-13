import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { improvePromptSchema, validateAndParse } from "../_shared/zod-schemas.ts";

const mainHandler = async (req: Request) => {
  const corsHeaders = {
    ...createCorsHeaders(),
    ...createSecurityHeaders()
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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

    const rawBody = await req.json();

    // ✅ Validate with Zod schema
    const validation = validateAndParse(improvePromptSchema, rawBody);
    if (!validation.success) {
      logger.warn('Invalid improve-prompt payload', { errors: validation.errors.errors });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters', 
          details: validation.errors.errors.map(e => ({ path: e.path.join('.'), message: e.message }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt } = validation.data;

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
            content: `You are an expert music prompt engineer specialized in AI music generation. Transform simple descriptions into rich, detailed prompts that AI can translate into exceptional music.

ENHANCE WITH:
- **Genre & Style**: Specific subgenres, fusion elements, era/period
- **Instrumentation**: Key instruments, electronic/acoustic balance, unique sounds
- **Tempo & Rhythm**: BPM range, time signature, rhythmic patterns, groove
- **Mood & Atmosphere**: Emotional tone, energy level, production vibe
- **Structure**: Arrangement hints (verse, chorus, build-ups, drops)
- **Production**: Mix style (clean/lo-fi), reverb, effects, mastering approach

RULES:
- Keep 2-4 sentences, maximum 100 words
- Be specific and actionable for AI
- Use musical terminology
- Avoid vague descriptions
- Focus on what makes sound unique`
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
      logger.error('Lovable AI error', { status: response.status, error: errorText });
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
    logger.error('Error in improve-prompt', { error: error instanceof Error ? error.message : String(error) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

const handler = withRateLimit(mainHandler, {
  maxRequests: 20,
  windowMinutes: 1,
  endpoint: 'improve-prompt'
});

serve(handler);
