import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

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
  const corsHeaders = createCorsHeaders(req);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createSupabaseAdminClient();
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

    logger.info('Boost style request received', {
      userId: user.id,
      contentLength: content.length,
      contentPreview: content.substring(0, 100)
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
      logger.error('Suno API error in boost-style', {
        error: errorText,
        status: response.status,
        userId: user.id
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

    logger.info('Suno API response received', {
      code: data.code,
      msg: data.msg,
      successFlag: data.data?.successFlag,
      hasErrorMessage: !!data.data?.errorMessage,
      errorCode: data.data?.errorCode,
      userId: user.id
    });

    if (data.code !== 200) {
      logger.error('Suno response error in boost-style', {
        error: data.msg,
        errorDetails: data.data?.errorMessage,
        code: data.code,
        fullResponse: JSON.stringify(data),
        userId: user.id
      });
      return new Response(
        JSON.stringify({ 
          error: data.msg || 'Style boost failed',
          details: data.data?.errorMessage 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for failure - Suno API returns "成功" (success in Chinese) on success
    // Only error if we have an explicit error message or error code
    if (data.data.errorCode || data.data.errorMessage) {
      logger.error('Suno generation failed in boost-style', {
        successFlag: data.data.successFlag,
        errorMessage: data.data.errorMessage,
        errorCode: data.data.errorCode,
        fullDataResponse: JSON.stringify(data.data),
        userId: user.id
      });
      return new Response(
        JSON.stringify({ 
          error: data.data.errorMessage || 'Style generation failed. Please try again with a different description.',
          code: data.data.errorCode,
          details: 'The AI style enhancement service encountered an issue. Try simplifying your style description.'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Boost style success', {
      taskId: data.data.taskId,
      creditsConsumed: data.data.creditsConsumed,
      creditsRemaining: data.data.creditsRemaining,
      resultLength: data.data.result.length,
      userId: user.id
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
    logger.error('Boost style function error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
