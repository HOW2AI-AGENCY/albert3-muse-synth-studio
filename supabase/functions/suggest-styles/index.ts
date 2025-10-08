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
      logger.error('Lovable AI error', {
        status: response.status,
        response: errorText,
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

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in suggest-styles', { error: error instanceof Error ? error : new Error(String(error)) });
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' }),
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
