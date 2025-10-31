import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

interface BoostStyleRequest {
  content: string;
}

serve(async (req) => {
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createSupabaseAdminClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { content }: BoostStyleRequest = await req.json();

    if (!content || !content.trim()) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Recommended max ~200 characters
    if (content.length > 500) {
      return new Response(
        JSON.stringify({ error: 'Style description too long. Please keep it under 500 characters.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Boost style request received', {
      userId: user.id,
      contentLength: content.length,
      contentPreview: content.substring(0, 100)
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Use Lovable AI Gateway to improve the prompt
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
- Keep 2-4 sentences, maximum 150 words
- Be specific and actionable for AI
- Use musical terminology
- Avoid vague descriptions
- Focus on what makes sound unique
- Return ONLY the enhanced prompt, no explanations`
          },
          {
            role: 'user',
            content: `Improve this music description for AI generation: "${content}"`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI error in boost-style', {
        error: errorText,
        status: response.status,
        userId: user.id
      });

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            code: 429
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'AI service credits exhausted. Please top up your Lovable workspace.',
            code: 402
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    const improvedPrompt = data.choices?.[0]?.message?.content;

    if (!improvedPrompt) {
      throw new Error('No response from AI');
    }

    logger.info('Boost style success', {
      resultLength: improvedPrompt.length,
      userId: user.id
    });

    return new Response(
      JSON.stringify({
        success: true,
        result: improvedPrompt.trim()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    logger.error('Boost style function error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
