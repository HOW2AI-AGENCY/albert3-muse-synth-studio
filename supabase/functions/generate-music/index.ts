import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { withRateLimit, createSecurityHeaders } from "../_shared/security.ts";
import { validateRequest, validationSchemas } from "../_shared/validation.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

const mainHandler = async (req: Request): Promise<Response> => {
  const corsHeaders = {
    ...createCorsHeaders(req),
    ...createSecurityHeaders()
  };

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    logger.info('Request received', 'generate-music');

    // Получение пользователя из JWT токена
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      logger.error('No authorization header', 'generate-music');
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseClient = createSupabaseUserClient(token)

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      logger.error('Auth error', authError ?? new Error('No user'), 'generate-music');
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Валидация входных данных
    const validatedData = await validateRequest(req, validationSchemas.generateMusic);
    const { trackId = '', prompt = '' } = validatedData as { trackId?: string; prompt?: string };

    logger.info('Validated data', 'generate-music', { trackId, promptLength: prompt.length, userId: user.id });

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY is not configured');
    }

    // Initialize Supabase client for updating track status
    const supabase = createSupabaseAdminClient();

    logger.info(`Starting music generation for track ${trackId}`, 'generate-music', { trackId, promptLength: prompt.length });

    // Update track status to processing
    await supabase
      .from('tracks')
      .update({ status: 'processing' })
      .eq('id', trackId);

    // Call Replicate API to generate music
    // Using meta/musicgen model - generates music from text descriptions
    const replicateResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'b05b1dff1d8c6dc63d14b0cdb42135378dcb87f6373b0d3d341ede46e59e2b38',
        input: {
          prompt: prompt,
          model_version: 'stereo-large',
          output_format: 'mp3',
          normalization_strategy: 'peak',
          duration: 30, // 30 seconds generation
        },
      }),
    });

    if (!replicateResponse.ok) {
      const errorText = await replicateResponse.text();
      logger.error('Replicate API error', new Error(`Status ${replicateResponse.status}: ${errorText}`), 'generate-music', { status: replicateResponse.status });
      throw new Error(`Music generation service error: ${replicateResponse.status}`);
    }

    const prediction = await replicateResponse.json();
    logger.info('Replicate prediction started', 'generate-music', { predictionId: prediction.id });

    // Poll for completion (with timeout)
    const maxAttempts = 60; // 60 attempts * 5 seconds = 5 minutes max
    let attempts = 0;
    let finalPrediction = prediction;

    while (
      finalPrediction.status !== 'succeeded' &&
      finalPrediction.status !== 'failed' &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            'Authorization': `Token ${REPLICATE_API_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!statusResponse.ok) {
        logger.error('Failed to check prediction status', new Error(`Status ${statusResponse.status}`), 'generate-music', { status: statusResponse.status });
        break;
      }

      finalPrediction = await statusResponse.json();
      attempts++;
      logger.info('Polling prediction status', 'generate-music', { attempt: attempts, status: finalPrediction.status });
    }

    if (finalPrediction.status === 'succeeded' && finalPrediction.output) {
      // Update track with the generated audio URL
      const audioUrl = finalPrediction.output;
      
      await supabase
        .from('tracks')
        .update({
          status: 'completed',
          audio_url: audioUrl,
          duration: 30,
        })
        .eq('id', trackId);

      logger.info('Music generation completed', 'generate-music', { trackId });

      return new Response(
        JSON.stringify({ success: true, trackId, audioUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } else {
      // Generation failed or timed out
      const errorMessage = finalPrediction.error || 'Music generation timed out or failed';
      
      await supabase
        .from('tracks')
        .update({
          status: 'failed',
          error_message: errorMessage,
        })
        .eq('id', trackId);

      logger.error('Music generation failed', new Error(errorMessage), 'generate-music', { trackId });

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    logger.error('Generate-music error', error instanceof Error ? error : new Error(String(error)), 'generate-music');
    
    // Determine appropriate error code
    let status = 500;
    let message = 'Internal server error';
    
    if (error instanceof Error) {
      if (error.message.includes('Unauthorized') || error.message.includes('Authorization')) {
        status = 401;
        message = 'Требуется авторизация';
      } else if (error.message.includes('Payment') || error.message.includes('402')) {
        status = 402;
        message = 'Недостаточно средств на балансе Replicate API';
      } else if (error.message.includes('Rate limit') || error.message.includes('429')) {
        status = 429;
        message = 'Превышен лимит запросов. Попробуйте позже';
      } else {
        message = error.message;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        error: message,
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
};

// Применяем rate limiting middleware
const handler = withRateLimit(mainHandler, {
  maxRequests: 5,
  windowMinutes: 1,
  endpoint: 'generate-music'
});

serve(handler);
