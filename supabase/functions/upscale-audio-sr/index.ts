/**
 * AudioSR Upscale Edge Function
 * Upsamples audio files to 48kHz with enhanced quality using Replicate
 * Supports both sakemin/audiosr-long-audio and nateraw/audio-super-resolution models
 *
 * @version 2.0.0
 * @since 2025-11-02
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Replicate from 'https://esm.sh/replicate@0.25.2';
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseUserClient, createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";

interface AudioUpscaleRequest {
  trackId?: string;
  inputFileUrl: string;
  truncatedBatches?: boolean;
  ddimSteps?: number;
  guidanceScale?: number;
  seed?: number;
  modelVersion?: 'sakemin/audiosr-long-audio' | 'nateraw/audio-super-resolution';
  predictionId?: string; // For status check
  jobId?: string; // For status check via job
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
    const adminClient = createSupabaseAdminClient();

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    // Status check via job ID
    if (body.jobId) {
      logger.info('Checking status via job', 'upscale-audio-sr', { jobId: body.jobId, userId: user.id });
      
      const { data: job, error: jobError } = await adminClient
        .from('audio_upscale_jobs')
        .select('*')
        .eq('id', body.jobId)
        .single();

      if (jobError || !job) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If job has prediction ID, fetch latest status
      if (job.replicate_prediction_id) {
        const prediction = await replicate.predictions.get(job.replicate_prediction_id);
        
        // Update job status based on prediction
        if (prediction.status === 'succeeded' && prediction.output) {
          await adminClient
            .from('audio_upscale_jobs')
            .update({
              status: 'completed',
              output_audio_url: prediction.output,
              completed_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', body.jobId);
        } else if (prediction.status === 'failed') {
          await adminClient
            .from('audio_upscale_jobs')
            .update({
              status: 'failed',
              error_message: prediction.error || 'Prediction failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', body.jobId);
        } else if (prediction.status === 'processing') {
          await adminClient
            .from('audio_upscale_jobs')
            .update({
              status: 'processing',
              updated_at: new Date().toISOString()
            })
            .eq('id', body.jobId);
        }

        return new Response(
          JSON.stringify({ ...job, prediction }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify(job),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Status check via prediction ID
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
      userId: user.id,
      trackId: body.trackId
    });

    // Create job record
    const { data: job, error: jobError } = await adminClient
      .from('audio_upscale_jobs')
      .insert({
        user_id: user.id,
        track_id: body.trackId,
        input_audio_url: body.inputFileUrl,
        model_version: body.modelVersion || 'sakemin/audiosr-long-audio',
        truncated_batches: body.truncatedBatches ?? true,
        ddim_steps: body.ddimSteps || 50,
        guidance_scale: body.guidanceScale || 3.5,
        seed: body.seed,
        status: 'pending',
        metadata: {
          started_at: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (jobError) {
      logger.error('Failed to create job', jobError, 'upscale-audio-sr');
      throw jobError;
    }

    // Model version mapping
    const modelMap = {
      'sakemin/audiosr-long-audio': 'sakemin/audiosr-long-audio:7b71ea09a65e5a8d9ad8c3a3e1522e9df7d70e55bb8f70e954d17d80abfc2fce',
      'nateraw/audio-super-resolution': 'nateraw/audio-super-resolution:a4af8e8f60c08cb6fdb58c13b79fe9e09d95f8e06db5e35499e3f7d8a25f6a95'
    };

    const modelVersion = body.modelVersion || 'sakemin/audiosr-long-audio';
    const replicateVersion = modelMap[modelVersion];

    const prediction = await replicate.predictions.create({
      version: replicateVersion,
      input: {
        input_file: body.inputFileUrl,
        ...(modelVersion === 'sakemin/audiosr-long-audio' && { 
          truncated_batches: body.truncatedBatches ?? true 
        }),
        ddim_steps: body.ddimSteps || 50,
        guidance_scale: body.guidanceScale || 3.5,
        ...(body.seed && { seed: body.seed })
      }
    });

    logger.info('Prediction created', 'upscale-audio-sr', { 
      predictionId: prediction.id,
      jobId: job.id
    });

    // Update job with prediction ID
    await adminClient
      .from('audio_upscale_jobs')
      .update({
        replicate_prediction_id: prediction.id,
        status: 'processing'
      })
      .eq('id', job.id);

    return new Response(
      JSON.stringify({
        success: true,
        jobId: job.id,
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
