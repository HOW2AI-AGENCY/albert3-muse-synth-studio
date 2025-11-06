/**
 * AudioSR Upscale Edge Function
 * Upsamples audio files to 48kHz with enhanced quality
 *
 * @version 1.0.0
 * @since 2025-11-02
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Replicate from 'https://esm.sh/replicate@0.25.2';
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

interface AudioUpscaleRequest {
  inputFileUrl: string;
  truncatedBatches?: boolean;
  ddimSteps?: number;
  guidanceScale?: number;
  seed?: number;
  predictionId?: string; // For status check
}

serve(async (req) => {
  const corsHeaders = {
    ...createCorsHeaders(req),
    ...createSecurityHeaders()
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('Missing authorization header', 'upscale-audio-sr');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      logger.error('Authentication failed', userError ?? new Error('No user'), 'upscale-audio-sr');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY not configured');
    }

    const body: AudioUpscaleRequest = await req.json();

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    // Status check
    if (body.predictionId) {
      logger.info('Checking status', 'upscale-audio-sr', { predictionId: body.predictionId, userId: user.id });
      const prediction = await replicate.predictions.get(body.predictionId);

      return new Response(
        JSON.stringify(prediction),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validation
    if (!body.inputFileUrl) {
      return new Response(
        JSON.stringify({ error: 'inputFileUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Starting upscale', 'upscale-audio-sr', {
      inputUrl: body.inputFileUrl,
      truncatedBatches: body.truncatedBatches ?? true,
      userId: user.id
    });

    const prediction = await replicate.predictions.create({
      version: '7a9b8e4f6e0b0a0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e0e',
      input: {
        input_file: body.inputFileUrl,
        truncated_batches: body.truncatedBatches ?? true,
        ddim_steps: body.ddimSteps || 50,
        guidance_scale: body.guidanceScale || 3.5,
        ...(body.seed && { seed: body.seed })
      }
    });

    logger.info('Prediction created', 'upscale-audio-sr', { predictionId: prediction.id });

    return new Response(
      JSON.stringify({
        success: true,
        predictionId: prediction.id,
        status: prediction.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('Error', error instanceof Error ? error : new Error(String(error)), 'upscale-audio-sr');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
