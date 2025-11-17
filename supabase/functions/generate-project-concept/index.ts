import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { logger } from '../_shared/logger.ts';
import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
    
    if (!prompt || typeof prompt !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    logger.info('Generating full project concept with AI', { endpoint: 'generate-project-concept' });

    // System prompt для детальной генерации проекта
    const systemPrompt = `You are a professional music project planner and creative director.
Generate complete, production-ready music project concepts with detailed tracklists.

Guidelines:
- Create compelling, marketable project names
- Write rich, detailed concept descriptions
- Generate realistic, creative track titles
- Provide specific style prompts for each track that can be used for AI music generation
- Include tempo range, mood, and genre specifics
- Track notes should describe the musical direction and vibe
- Duration targets should be realistic (180-240 seconds per track)

Output must use the generate_music_project tool with ALL fields filled.`;

    const userPrompt = `Create a complete music project concept based on this user request:

"${prompt}"

Generate:
1. A catchy project name
2. Detailed concept description (3-5 sentences)
3. Genre and mood
4. 5-8 relevant style tags
5. Story theme or artistic vision
6. Tempo range
7. Full tracklist (8-12 tracks) with:
   - Creative track titles
   - Style prompts (detailed descriptions for AI music generation)
   - Target duration
   - Notes about the track's role in the project`;

    // Call Lovable AI with structured output via tool calling
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
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 3000,
        tools: [
          {
            type: 'function',
            function: {
              name: 'generate_music_project',
              description: 'Generate a complete music project with full tracklist and metadata',
              parameters: {
                type: 'object',
                properties: {
                  name: { 
                    type: 'string',
                    description: 'Project name - catchy, memorable, relevant to concept'
                  },
                  genre: { 
                    type: 'string',
                    description: 'Primary music genre (e.g., Electronic, Rock, Jazz)'
                  },
                  mood: { 
                    type: 'string',
                    description: 'Overall mood (e.g., Energetic, Melancholic, Uplifting)'
                  },
                  style_tags: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of 5-8 style tags that describe the musical style'
                  },
                  concept_description: { 
                    type: 'string',
                    description: 'Detailed project concept (3-5 sentences) explaining the artistic vision'
                  },
                  story_theme: { 
                    type: 'string',
                    description: 'Narrative or thematic thread connecting all tracks'
                  },
                  tempo_range: {
                    type: 'object',
                    properties: {
                      min: { type: 'number', description: 'Minimum BPM' },
                      max: { type: 'number', description: 'Maximum BPM' }
                    },
                    required: ['min', 'max']
                  },
                  planned_tracks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        order: { 
                          type: 'number',
                          description: 'Track position in album (1, 2, 3...)'
                        },
                        title: { 
                          type: 'string',
                          description: 'Creative, memorable track title'
                        },
                        style_prompt: {
                          type: 'string',
                          description: 'Detailed style description for AI music generation (2-3 sentences describing genre, mood, instruments, tempo, vibe)'
                        },
                        duration_target: { 
                          type: 'number',
                          description: 'Target duration in seconds (typically 180-240)'
                        },
                        notes: { 
                          type: 'string',
                          description: 'Additional notes about the track concept, role in the album, or artistic direction'
                        }
                      },
                      required: ['order', 'title', 'style_prompt', 'duration_target']
                    },
                    description: 'Complete tracklist (8-12 tracks recommended)'
                  }
                },
                required: [
                  'name', 
                  'genre', 
                  'mood', 
                  'style_tags', 
                  'concept_description', 
                  'story_theme',
                  'tempo_range',
                  'planned_tracks'
                ],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'generate_music_project' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Lovable AI API error', new Error(errorText), 'generate-project-concept', { 
        status: response.status,
        statusText: response.statusText 
      });
      
      // Handle specific error codes with user-friendly messages
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'rate_limit_exceeded',
            message: 'Слишком много запросов к AI. Подождите минуту и попробуйте снова.',
            retryAfter: 60
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'insufficient_credits',
            message: 'Недостаточно AI кредитов. Обновите тариф в настройках.',
            upgradeUrl: '/workspace/subscription'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'ai_gateway_error',
          message: 'Не удалось сгенерировать концепцию проекта. Попробуйте позже.',
          details: errorText
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();
    
    // Extract tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'generate_music_project') {
      throw new Error('Invalid AI response format');
    }

    const projectConcept = JSON.parse(toolCall.function.arguments);

    logger.info('Project generated', {
      endpoint: 'generate-project-concept',
      name: projectConcept.name,
      trackCount: projectConcept.planned_tracks?.length || 0
    });

    return new Response(
      JSON.stringify(projectConcept),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error in generate-project-concept', error instanceof Error ? error : new Error(String(error)), 'generate-project-concept');
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
