/**
 * AudioSR Upscale Edge Function
 * Upsamples audio files to 48kHz with enhanced quality
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Replicate from 'https://esm.sh/replicate@0.25.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AudioUpscaleRequest {
  inputFileUrl: string;
  truncatedBatches?: boolean;
  ddimSteps?: number;
  guidanceScale?: number;
  seed?: number;
  predictionId?: string; // For status check
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
    if (!REPLICATE_API_KEY) {
      throw new Error('REPLICATE_API_KEY not configured');
    }

    const body: AudioUpscaleRequest = await req.json();

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    // Status check
    if (body.predictionId) {
      console.log('[upscale-audio-sr] Checking status:', body.predictionId);
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

    console.log('[upscale-audio-sr] Starting upscale:', {
      inputUrl: body.inputFileUrl,
      truncatedBatches: body.truncatedBatches ?? true
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

    console.log('[upscale-audio-sr] Prediction created:', prediction.id);

    return new Response(
      JSON.stringify({
        success: true,
        predictionId: prediction.id,
        status: prediction.status
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[upscale-audio-sr] Error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
