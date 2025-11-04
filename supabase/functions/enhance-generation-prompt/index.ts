import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { logger } from '../_shared/logger.ts';

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
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    if (token) {
      const { error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) {
        logger.warn('Auth token invalid:', { error: userError.message });
      }
    } else {
      logger.warn('No auth token provided - proceeding as guest');
    }

    const body: EnhancePromptRequest = await req.json();
    const { prompt, genre, mood, tags, provider } = body;

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt is required');
    }

    // Provider-specific enhancement
    if (provider === 'suno') {
      const sunoApiKey = Deno.env.get('SUNO_API_KEY');
      if (!sunoApiKey) {
        return new Response(
          JSON.stringify({ success: false, error: 'SUNO_API_KEY is not configured' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Build concise style content for Suno API
      let content = (tags && tags.trim()) || [genre, mood].filter(Boolean).join(', ').trim();
      if (!content) {
        // Fallback: extract a short style phrase from the prompt
        const firstClause = prompt.split(/[.|,;|\n]/)[0] || prompt;
        content = firstClause.slice(0, 80);
      }

      const sunoResp = await fetch('https://api.sunoapi.org/api/v1/style/generate', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sunoApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      });

      const sunoText = await sunoResp.text();
      let sunoJson: any;
      try {
        sunoJson = sunoText ? JSON.parse(sunoText) : null;
      } catch {
        sunoJson = null;
      }

      if (!sunoResp.ok || !sunoJson || sunoJson.code !== 200) {
        const status = sunoResp.status || 400;
        const providerCode = sunoJson?.code ?? null;
        const msg = sunoJson?.msg || 'Style generation failed';
        return new Response(
          JSON.stringify({ success: false, error: msg, providerCode }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: status === 429 ? 429 : status === 402 ? 402 : 400 }
        );
      }

      const styleResult = (sunoJson.data?.result || '').toString().trim();
      const addedElements = styleResult
        ? styleResult.split(/[，,|/]/).map((s: string) => s.trim()).filter(Boolean)
        : [];

      // Compose concise enhanced prompt
      let enhancedPrompt = prompt.trim();
      if (styleResult) {
        enhancedPrompt = `${enhancedPrompt} | Style: ${styleResult}`;
      }
      // Keep it short for Suno
      if (enhancedPrompt.length > 800) {
        enhancedPrompt = enhancedPrompt.slice(0, 800);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            enhancedPrompt,
            addedElements,
            reasoning: 'Used Suno style generator to condense style based on your inputs.'
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Prepare context for AI
    const context = {
      genre: genre || 'unknown',
      mood: mood || 'unknown',
      tags: tags || '',
      provider: provider || 'suno',
    };

    // Build system prompt based on provider
    const isSuno = (provider as any) === 'suno';
    const providerName = isSuno ? 'Suno AI' : 'Mureka';
    const providerGuidance = isSuno
      ? 'Focus on natural language descriptions, mood words, and style tags'
      : 'Be more technical with BPM, key, and instrument specifics';

    const systemPrompt = `You are a music production expert specializing in ${providerName} music generation.

Your task: Enhance the user's music description to maximize generation quality.

Guidelines:
1. Add specific instruments and production techniques appropriate for the genre
2. Include song structure hints (intro, verse, chorus, bridge, outro) when relevant
3. Add technical details (tempo range, key suggestions, dynamics)
4. Use genre-specific vocabulary and terminology
5. Keep the user's original intent - enhance, don't replace
6. For ${provider}: ${providerGuidance}

Context:
- Genre: ${context.genre}
- Mood: ${context.mood}
- Tags: ${context.tags}

Original prompt: "${prompt}"

Return a JSON object with:
- enhancedPrompt: The improved prompt (keep it under 200 words)
- addedElements: Array of elements you added (e.g., ["808 bass", "verse-chorus structure", "120 BPM"])
- reasoning: Brief explanation of improvements (1-2 sentences)`;

    // Call Lovable AI Gateway
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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
      logger.error('AI API error:', { error: await aiResponse.text() });
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
    logger.error('Error enhancing prompt:', { error });
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
