/**
 * MiniMax Music-1.5 Generation Edge Function
 * Full-length songs (up to 4 mins) with natural vocals & rich instrumentation
 * 
 * @version 1.0.0
 * @since 2025-11-02
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Replicate from 'https://esm.sh/replicate@0.25.2';
import { logger } from '../_shared/logger.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MinimaxGenerationRequest {
  prompt: string;
  lyrics: string;
  referenceAudioUrl?: string;
  styleStrength?: number;
  sampleRate?: number;
  bitrate?: number;
  audioFormat?: 'mp3' | 'wav';
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

    const body: MinimaxGenerationRequest = await req.json();

    // Validation
    if (!body.prompt || body.prompt.length < 10 || body.prompt.length > 300) {
      return new Response(
        JSON.stringify({ error: 'Prompt must be 10-300 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!body.lyrics || body.lyrics.length < 10 || body.lyrics.length > 600) {
      return new Response(
        JSON.stringify({ error: 'Lyrics must be 10-600 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Starting MiniMax generation', 'generate-minimax', {
      promptLength: body.prompt.length,
      lyricsLength: body.lyrics.length,
      hasReference: !!body.referenceAudioUrl
    });

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const input: Record<string, unknown> = {
      prompt: body.prompt,
      lyrics: body.lyrics,
      sample_rate: body.sampleRate || 44100,
      bitrate: body.bitrate || 256000,
      audio_format: body.audioFormat || 'mp3',
      output_format: 'hex'
    };

    // Add reference audio if provided
    if (body.referenceAudioUrl) {
      input.reference_audio = body.referenceAudioUrl;
      input.style_strength = body.styleStrength || 0.8;
    }

    logger.info('Calling Replicate API for MiniMax', 'generate-minimax');

    const output = await replicate.run(
      'minimax/music-1.5',
      { input }
    );

    logger.info('MiniMax generation complete', 'generate-minimax', { hasOutput: !!output });

    return new Response(
      JSON.stringify({
        success: true,
        audioUrl: output as string,
        prompt: body.prompt,
        lyrics: body.lyrics
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    logger.error('MiniMax generation error', error instanceof Error ? error : new Error(String(error)), 'generate-minimax');
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
