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
    const { prompt, mode, projectType, trackCount = 10 } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    logger.info('[ai-project-wizard] Generating draft', { mode, projectType, trackCount });

    // Build system prompt
    const systemPrompt = `You are a music project planner AI. Create detailed, creative music project concepts.
Format: Use the draft_music_project tool to return a structured project.
Include: project name, description, genre, mood, style tags, concept, story theme, and planned tracklist.
Be creative but realistic. Match the project type and track count requested.`;

    const userPrompt = mode === 'draft'
      ? `Create a ${projectType} music project with ${trackCount} tracks based on this concept:\n\n${prompt}`
      : `Refine this project concept:\n\n${prompt}`;

    // Call Lovable AI with tool calling
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
        tools: [
          {
            type: 'function',
            function: {
              name: 'draft_music_project',
              description: 'Create a detailed music project draft',
              parameters: {
                type: 'object',
                properties: {
                  name: { 
                    type: 'string',
                    description: 'Project name (catchy and relevant)'
                  },
                  description: { 
                    type: 'string',
                    description: 'Detailed project description (2-3 sentences)'
                  },
                  genre: { 
                    type: 'string',
                    description: 'Primary genre'
                  },
                  mood: { 
                    type: 'string',
                    description: 'Overall mood/vibe'
                  },
                  style_tags: { 
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Array of style tags (5-8 tags)'
                  },
                  concept_description: { 
                    type: 'string',
                    description: 'Artistic concept (1-2 sentences)'
                  },
                  story_theme: { 
                    type: 'string',
                    description: 'Narrative or thematic thread'
                  },
                  planned_tracks: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        order: { type: 'number' },
                        title: { type: 'string' },
                        notes: { type: 'string' },
                      },
                      required: ['order', 'title']
                    },
                    description: 'Tracklist with creative titles and optional notes'
                  }
                },
                required: ['name', 'description', 'genre', 'mood', 'style_tags', 'planned_tracks'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'draft_music_project' } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorText = await response.text();
      logger.error('[ai-project-wizard] AI error', { status: response.status, errorText });
      throw new Error('AI gateway error');
    }

    const result = await response.json();
    
    // Extract tool call result
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== 'draft_music_project') {
      throw new Error('Invalid AI response format');
    }

    const draft = JSON.parse(toolCall.function.arguments);
    
    // Add project_type to draft
    draft.project_type = projectType;

    logger.info('[ai-project-wizard] Draft generated', { name: draft.name });

    return new Response(
      JSON.stringify({ draft }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('[ai-project-wizard] Error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
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
