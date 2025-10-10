import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BoostStyleRequest {
  content: string;
}

interface SunoBoostResponse {
  code: number;
  msg: string;
  data: {
    taskId: string;
    param: string;
    result: string;
    creditsConsumed: number;
    creditsRemaining: number;
    successFlag: string;
    errorCode?: number;
    errorMessage?: string;
    createTime: string;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
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
    if (content.length > 250) {
      return new Response(
        JSON.stringify({ error: 'Style description too long. Please keep it under 200 characters for best results.' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🎨 [BOOST-STYLE] Request', {
      userId: user.id,
      contentLength: content.length,
      content: content.substring(0, 100) + (content.length > 100 ? '...' : '')
    });

    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('Suno API key not configured');
    }

    const response = await fetch('https://api.sunoapi.org/api/v1/style/generate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUNO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [BOOST-STYLE] Suno API Error', {
        status: response.status,
        error: errorText
      });

      if (response.status === 413) {
        return new Response(
          JSON.stringify({ error: 'Style description too long. Please shorten it.' }),
          { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Insufficient Suno credits or rate limit exceeded. Please try again later.',
            code: 429
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 430) {
        return new Response(
          JSON.stringify({ error: 'Call frequency too high. Please wait a moment and try again.' }),
          { status: 430, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 455) {
        return new Response(
          JSON.stringify({ error: 'Suno API is under maintenance. Please try again later.' }),
          { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`Suno API error: ${response.status}`);
    }

    const data: SunoBoostResponse = await response.json();

    if (data.code !== 200) {
      console.error('❌ [BOOST-STYLE] Suno response error', data);
      return new Response(
        JSON.stringify({ 
          error: data.msg || 'Style boost failed',
          details: data.data?.errorMessage 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (data.data.successFlag !== '1') {
      return new Response(
        JSON.stringify({ 
          error: data.data.errorMessage || 'Style generation failed',
          code: data.data.errorCode 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✨ [BOOST-STYLE] Success', {
      taskId: data.data.taskId,
      creditsConsumed: data.data.creditsConsumed,
      creditsRemaining: data.data.creditsRemaining,
      resultLength: data.data.result.length
    });

    return new Response(
      JSON.stringify({
        success: true,
        result: data.data.result,
        creditsConsumed: data.data.creditsConsumed,
        creditsRemaining: data.data.creditsRemaining,
        taskId: data.data.taskId
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ [BOOST-STYLE] Error', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
