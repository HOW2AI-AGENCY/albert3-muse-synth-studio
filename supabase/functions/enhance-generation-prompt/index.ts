import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EnhancePromptRequest {
  prompt: string;
  genre?: string;
  mood?: string;
  tags?: string;
  provider: 'suno' | 'mureka';
}

interface EnhancePromptResponse {
  enhancedPrompt: string;
  addedElements: string[];
  reasoning: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('Unauthorized');
    }

    const body: EnhancePromptRequest = await req.json();
    const { prompt, genre, mood, tags, provider } = body;

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    // Prepare context for AI
    const context = {
      genre: genre || 'unknown',
      mood: mood || 'unknown',
      tags: tags || '',
      provider: provider || 'suno',
    };

    // Build system prompt based on provider
    const systemPrompt = `You are a music production expert specializing in ${provider === 'suno' ? 'Suno AI' : 'Mureka'} music generation.

Your task: Enhance the user's music description to maximize generation quality.

Guidelines:
1. Add specific instruments and production techniques appropriate for the genre
2. Include song structure hints (intro, verse, chorus, bridge, outro) when relevant
3. Add technical details (tempo range, key suggestions, dynamics)
4. Use genre-specific vocabulary and terminology
5. Keep the user's original intent - enhance, don't replace
6. For ${provider}: ${provider === 'suno' 
  ? 'Focus on natural language descriptions, mood words, and style tags' 
  : 'Be more technical with BPM, key, and instrument specifics'}

Context:
- Genre: ${context.genre}
- Mood: ${context.mood}
- Tags: ${context.tags}

Original prompt: "${prompt}"

Return a JSON object with:
- enhancedPrompt: The improved prompt (keep it under 200 words)
- addedElements: Array of elements you added (e.g., ["808 bass", "verse-chorus structure", "120 BPM"])
- reasoning: Brief explanation of improvements (1-2 sentences)`;

    // Call Lovable AI
    const aiResponse = await fetch('https://api.lovable.app/v1/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Enhance this music prompt: "${prompt}"` }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      throw new Error('Failed to enhance prompt');
    }

    const aiData = await aiResponse.json();
    const enhancedData: EnhancePromptResponse = JSON.parse(
      aiData.choices[0].message.content
    );

    // Validate response
    if (!enhancedData.enhancedPrompt || !enhancedData.addedElements || !enhancedData.reasoning) {
      throw new Error('Invalid AI response format');
    }

    // Ensure enhanced prompt isn't too long
    if (enhancedData.enhancedPrompt.length > 1000) {
      enhancedData.enhancedPrompt = enhancedData.enhancedPrompt.slice(0, 1000);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: enhancedData,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error enhancing prompt:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to enhance prompt';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
