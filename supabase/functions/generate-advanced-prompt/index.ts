import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logger, withSentry } from "../_shared/logger.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders()
};

interface AdvancedPromptRequest {
  styleRecommendations: {
    tags: string[];
    instruments: string[];
    techniques: string[];
    vocalStyle?: string | null;
    references?: string[];
  };
  currentPrompt: string;
  currentLyrics?: string;
  genre?: string;
  mood?: string;
}

const mainHandler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    // ✅ JWT Token Validation
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.warn('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { 
          headers: { Authorization: authHeader } 
        }
      }
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      logger.warn('Invalid JWT token', { error: authError?.message });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Processing request for user', { userId: user.id });

    const { 
      styleRecommendations, 
      currentPrompt, 
      currentLyrics,
      genre,
      mood 
    } = await req.json() as AdvancedPromptRequest;

    if (!styleRecommendations || !currentPrompt) {
      logger.warn('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'styleRecommendations and currentPrompt are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Processing advanced prompt generation', {
      userId: user.id,
      hasLyrics: !!currentLyrics,
      tagsCount: styleRecommendations.tags?.length || 0,
      instrumentsCount: styleRecommendations.instruments?.length || 0,
      techniquesCount: styleRecommendations.techniques?.length || 0,
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build comprehensive context for AI
    const aiContext = `
Generate an enhanced music creation prompt based on:

CURRENT PROMPT: ${currentPrompt}
${genre ? `GENRE: ${genre}` : ''}
${mood ? `MOOD: ${mood}` : ''}

AI STYLE RECOMMENDATIONS:
- Tags: ${styleRecommendations.tags.join(', ')}
- Instruments: ${styleRecommendations.instruments.join(', ')}
- Techniques: ${styleRecommendations.techniques.join(', ')}
${styleRecommendations.vocalStyle ? `- Vocal Style: ${styleRecommendations.vocalStyle}` : ''}
${styleRecommendations.references && styleRecommendations.references.length > 0 
  ? `- References: ${styleRecommendations.references.join(', ')}` 
  : ''}

${currentLyrics ? `CURRENT LYRICS (to be formatted):\n${currentLyrics}` : ''}

Your task:
1. Create an ENHANCED PROMPT that naturally integrates all AI recommendations into a cohesive, detailed description
2. ${currentLyrics ? 'Format the lyrics in Suno AI format with meta-tags, section markers, and production hints' : 'Leave formattedLyrics empty'}
3. Extract key meta-tags (Tempo, Key, Style elements) from the recommendations
`;

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
            content: 'You are an expert music producer and Suno AI prompt engineer. Create enhanced prompts and format lyrics with professional production tags.'
          },
          {
            role: 'user',
            content: aiContext
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "generate_advanced_prompt",
              description: "Generate enhanced music prompt and formatted lyrics with Suno AI meta-tags",
              parameters: {
                type: "object",
                properties: {
                  enhancedPrompt: {
                    type: "string",
                    description: "Enhanced prompt integrating all AI recommendations naturally (150-300 words, detailed)"
                  },
                  formattedLyrics: {
                    type: "string",
                    description: "Lyrics formatted in Suno AI style with [Tempo: X BPM], [Key: X], [Style: X], section tags [Intro], [Verse], [Chorus], instrument tags [808 bass], [synth pads], and effect tags [autotune], [reverb]. Empty string if no lyrics provided."
                  },
                  metaTags: {
                    type: "array",
                    description: "Key musical meta-tags extracted from recommendations (e.g., Tempo: 140 BPM, Key: C Minor, Style: trap)",
                    items: { type: "string" }
                  }
                },
                required: ["enhancedPrompt", "formattedLyrics", "metaTags"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_advanced_prompt" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 429) {
        logger.warn('Rate limit hit');
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            code: 'RATE_LIMIT_EXCEEDED',
            retryAfter: response.headers.get('Retry-After') || '60'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        logger.error('Insufficient AI credits');
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient AI credits. Please add funds to continue.',
            code: 'INSUFFICIENT_CREDITS'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      logger.error('AI service error', {
        status: response.status,
        response: errorText.substring(0, 500),
      });
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract structured output
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let result;
    
    if (toolCall?.function?.arguments) {
      try {
        result = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        logger.error('Failed to parse tool call arguments', {
          error: e instanceof Error ? e.message : String(e),
        });
        throw new Error('Invalid AI response format');
      }
    } else {
      throw new Error('No tool call in AI response');
    }

    logger.info('Advanced prompt generated', {
      promptLength: result.enhancedPrompt?.length || 0,
      lyricsLength: result.formattedLyrics?.length || 0,
      metaTagsCount: result.metaTags?.length || 0,
    });

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in generate-advanced-prompt', { 
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error',
        code: 'INTERNAL_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

const rateLimitedHandler = withRateLimit(mainHandler, {
  maxRequests: 20,
  windowMinutes: 1,
  endpoint: 'generate-advanced-prompt'
});

const handler = withSentry(rateLimitedHandler, { transaction: 'generate-advanced-prompt' });

serve(handler);
