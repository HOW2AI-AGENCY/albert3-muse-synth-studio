/**
 * AI Improve Field - Edge Function for AI-powered field enrichment
 * @version 1.0.0
 * 
 * @description
 * Provides AI actions (improve, generate, rewrite) for any text field
 * using Lovable AI with project/track context.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  field: string;
  value: string;
  action: 'improve' | 'generate' | 'rewrite';
  context?: string;
  additionalContext?: Record<string, any>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');

    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body: RequestBody = await req.json();
    const { field, value, action, context, additionalContext } = body;

    // Build system prompt based on action
    let systemPrompt = '';
    let userPrompt = '';

    switch (action) {
      case 'improve':
        systemPrompt = `You are an expert music AI assistant. Improve the following ${field} while preserving its core meaning. Make it more professional, creative, and effective for music generation.`;
        userPrompt = `Original ${field}: ${value}`;
        break;

      case 'generate':
        systemPrompt = `You are an expert music AI assistant. Generate a compelling ${field} based on the provided context. Be creative and specific.`;
        userPrompt = `Generate a ${field} for music creation`;
        break;

      case 'rewrite':
        systemPrompt = `You are an expert music AI assistant. Rewrite the following ${field} in a different style while maintaining its essence. Adapt it to the project's theme.`;
        userPrompt = `Rewrite this ${field}: ${value}`;
        break;
    }

    // Add context if provided
    if (context) {
      userPrompt += `\n\nProject Context:\n${context}`;
    }

    if (additionalContext) {
      userPrompt += `\n\nAdditional Context:\n${JSON.stringify(additionalContext, null, 2)}`;
    }

    // Call Lovable AI (using Gemini Flash by default)
    const aiResponse = await fetch('https://api.lovable.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const result = aiData.choices[0]?.message?.content || value;

    return new Response(
      JSON.stringify({ 
        success: true, 
        result: result.trim(),
        action,
        field,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('AI improve field error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        success: false,
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
