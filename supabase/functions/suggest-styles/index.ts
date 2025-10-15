import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logger, withSentry } from "../_shared/logger.ts";

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
      logger.warn('Missing authorization header', { 
        headers: Object.fromEntries(req.headers.entries())
      });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { mood, genre, context, currentTags } = await req.json();

    if (!mood && !genre && !context) {
      logger.warn('Empty request to suggest-styles', { 
        hasAuth: true,
        tagsCount: currentTags?.length || 0
      });
      return new Response(
        JSON.stringify({ error: 'At least one parameter required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Processing style suggestions', {
      hasMood: !!mood,
      hasGenre: !!genre,
      contextLength: context?.length || 0,
      tagsCount: currentTags?.length || 0,
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // УЛУЧШЕНО: Используем tool calling для structured output
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
            content: 'You are a music production expert and style consultant. Suggest specific, actionable style elements for AI music creation based on user preferences.'
          },
          {
            role: 'user',
            content: `Based on these preferences, suggest music style elements:
${mood ? `Mood: ${mood}` : ''}
${genre ? `Genre: ${genre}` : ''}
${context ? `Context: ${context}` : ''}
${currentTags ? `Current Tags: ${currentTags.join(', ')}` : ''}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_music_styles",
              description: "Suggest comprehensive music style elements and recommendations",
              parameters: {
                type: "object",
                properties: {
                  tags: {
                    type: "array",
                    description: "5-10 specific style tags (e.g., lo-fi, synthwave, trap beats)",
                    items: { type: "string" }
                  },
                  instruments: {
                    type: "array",
                    description: "Recommended instruments for this style",
                    items: { type: "string" }
                  },
                  techniques: {
                    type: "array",
                    description: "Production techniques or effects",
                    items: { type: "string" }
                  },
                  vocalStyle: {
                    type: "string",
                    description: "Vocal style recommendation (if applicable)"
                  },
                  references: {
                    type: "array",
                    description: "Reference tracks or artists matching this style",
                    items: { type: "string" }
                  }
                },
                required: ["tags", "instruments", "techniques"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_music_styles" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 429) {
        logger.warn('Rate limit hit for suggest-styles', { status: 429 });
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
        logger.error('Insufficient Lovable AI credits', { status: 402 });
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient AI credits. Please add funds to continue.',
            code: 'INSUFFICIENT_CREDITS'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      logger.error('Lovable AI error', {
        status: response.status,
        response: errorText.substring(0, 500),
      });
      throw new Error(`AI service error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract structured output from tool call
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    let suggestions;
    
    if (toolCall?.function?.arguments) {
      try {
        suggestions = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        logger.error('Failed to parse tool call arguments', {
          response: toolCall.function.arguments,
          error: e instanceof Error ? e : new Error(String(e)),
        });
        throw new Error('Invalid AI response format');
      }
    } else {
      throw new Error('No tool call in AI response');
    }

    logger.info('Style suggestions generated', {
      tagsCount: suggestions.tags?.length || 0,
      instrumentsCount: suggestions.instruments?.length || 0,
      techniquesCount: suggestions.techniques?.length || 0,
      hasVocalStyle: !!suggestions.vocalStyle,
    });

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in suggest-styles', { 
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
  maxRequests: 30,
  windowMinutes: 1,
  endpoint: 'suggest-styles'
});

const handler = withSentry(rateLimitedHandler, { transaction: 'suggest-styles' });

serve(handler);
