import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { logger, withSentry } from "../_shared/logger.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders()
};

interface GenerateTitleRequest {
  prompt: string;
  lyrics?: string;
  styleTags?: string[];
  provider?: string;
}

const mainHandler = async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    const userId = req.headers.get('X-User-Id');
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, lyrics, styleTags, provider } = await req.json() as GenerateTitleRequest;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Generating track title', {
      userId,
      promptLength: prompt.length,
      hasLyrics: !!lyrics,
      provider: provider || 'unknown'
    });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Build AI context
    const aiContext = `
Generate a creative, concise track title based on:

MUSIC DESCRIPTION: ${prompt}
${lyrics ? `LYRICS EXCERPT:\n${lyrics.substring(0, 500)}...` : ''}
${styleTags && styleTags.length > 0 ? `STYLE TAGS: ${styleTags.join(', ')}` : ''}
${provider ? `MUSIC PROVIDER: ${provider}` : ''}

Requirements:
- Title must be 2-6 words
- Catchy and memorable
- Reflect the mood and theme
- Professional and artistic
- No quotes or special characters
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
            content: 'You are a creative music title generator. Generate only the title, nothing else.'
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
              name: "generate_track_title",
              description: "Generate a creative track title",
              parameters: {
                type: "object",
                properties: {
                  title: {
                    type: "string",
                    description: "Creative track title (2-6 words, no quotes)"
                  }
                },
                required: ["title"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "generate_track_title" } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Rate limit exceeded. Please try again in a moment.',
            code: 'RATE_LIMIT_EXCEEDED'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient AI credits.',
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
    let title;
    
    if (toolCall?.function?.arguments) {
      try {
        const result = JSON.parse(toolCall.function.arguments);
        title = result.title;
      } catch (e) {
        logger.error('Failed to parse tool call arguments', {
          error: e instanceof Error ? e.message : String(e),
        });
        throw new Error('Invalid AI response format');
      }
    } else {
      throw new Error('No tool call in AI response');
    }

    if (!title || title.length === 0) {
      throw new Error('Empty title generated');
    }

    // Clean up title (remove quotes, trim)
    title = title.replace(/^["']|["']$/g, '').trim();

    logger.info('Track title generated', {
      title,
      titleLength: title.length,
    });

    return new Response(
      JSON.stringify({ title }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in generate-track-title', { 
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
  endpoint: 'generate-track-title'
});

const handler = withSentry(rateLimitedHandler, { transaction: 'generate-track-title' });

serve(handler);
