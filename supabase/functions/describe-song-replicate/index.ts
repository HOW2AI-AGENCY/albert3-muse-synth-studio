/**
 * Replicate AI Track Description & Analysis
 * Uses Meta MusicGen for analyzing music and generating descriptions
 * 
 * @endpoint POST /functions/v1/describe-song-replicate
 * @auth Required (JWT)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createReplicateClient } from "../_shared/replicate.ts";
import { logger } from "../_shared/logger.ts";
import { createCorsHeaders } from '../_shared/cors.ts';
import { createSecurityHeaders } from '../_shared/security.ts';

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

interface DescribeSongRequest {
  trackId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseAdmin = createSupabaseAdminClient();
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse request
    const { trackId }: DescribeSongRequest = await req.json();
    
    if (!trackId) {
      throw new Error('trackId is required');
    }

    // 3. Fetch track
    const { data: track, error: trackError } = await supabaseAdmin
      .from('tracks')
      .select('audio_url, user_id, title')
      .eq('id', trackId)
      .single();

    if (trackError || !track) {
      throw new Error('Track not found');
    }

    if (track.user_id !== user.id) {
      throw new Error('Unauthorized to analyze this track');
    }

    if (!track.audio_url) {
      throw new Error('Track has no audio URL');
    }

    logger.info('📖 Track description request (Replicate)', {
      trackId,
      audioUrl: track.audio_url,
    });

    // 4. Initialize Replicate client
    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY');
    if (!replicateApiKey) {
      throw new Error('REPLICATE_API_KEY not configured');
    }

    const replicateClient = createReplicateClient({ apiKey: replicateApiKey });

    // 5. Create description record
    const { data: description, error: upsertError } = await supabaseAdmin
      .from('song_descriptions')
      .upsert({
        user_id: user.id,
        track_id: trackId,
        audio_file_url: track.audio_url,
        status: 'processing',
        provider: 'replicate',
        ai_description: null,
        detected_genre: null,
        detected_mood: null,
        tempo_bpm: null,
        key_signature: null,
        detected_instruments: [],
        energy_level: null,
        danceability: null,
        valence: null,
        error_message: null,
      }, { onConflict: 'track_id' })
      .select('id')
      .single();

    if (upsertError || !description) {
      throw new Error('Failed to create description record');
    }

    // 6. Call Replicate API using music analysis model
    logger.info('🎼 Calling Replicate music analysis', { audioUrl: track.audio_url });
    
    // Using Meta's MusicGen for music understanding
    const prediction = await replicateClient.run(
      "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
      {
        audio: track.audio_url,
        prompt: `Analyze this music track and provide: genre, mood, tempo (BPM), key signature, instruments, energy level (0-100), danceability (0-100), and overall vibe. Track title: "${track.title}".`,
      }
    );

    const predictionId = prediction.id;

    await supabaseAdmin
      .from('song_descriptions')
      .update({ 
        fal_request_id: predictionId,
        metadata: prediction 
      })
      .eq('id', description.id);

    logger.info('✅ Replicate prediction created', {
      descriptionId: description.id,
      predictionId,
    });

    // 7. Background polling
    async function pollPrediction(attemptNumber = 0): Promise<void> {
      if (attemptNumber >= 30) {
        await supabaseAdmin
          .from('song_descriptions')
          .update({
            status: 'failed',
            error_message: 'Analysis timeout',
          })
          .eq('id', description.id);
        return;
      }

      try {
        const result = await replicateClient.get(predictionId);

        if (result.status === 'succeeded') {
          // Parse the generated text to extract structured data
          const output = result.output || '';
          const text = typeof output === 'string' ? output : JSON.stringify(output);

          // Simple parsing (можно улучшить regex)
          const genreMatch = text.match(/genre[:\s]+([a-z\s,]+)/i);
          const moodMatch = text.match(/mood[:\s]+([a-z\s,]+)/i);
          const tempoMatch = text.match(/tempo[:\s]+(\d+)/i);
          const keyMatch = text.match(/key[:\s]+([a-z#\s]+)/i);
          const instrumentsMatch = text.match(/instruments[:\s]+([a-z\s,]+)/i);
          const energyMatch = text.match(/energy[:\s]+(\d+)/i);
          const danceMatch = text.match(/danceability[:\s]+(\d+)/i);

          const detected_genre = genreMatch ? genreMatch[1].trim() : null;
          const detected_mood = moodMatch ? moodMatch[1].trim() : null;
          const tempo_bpm = tempoMatch ? parseInt(tempoMatch[1]) : null;
          const key_signature = keyMatch ? keyMatch[1].trim() : null;
          const detected_instruments = instrumentsMatch 
            ? instrumentsMatch[1].split(',').map((i: string) => i.trim()) 
            : [];
          const energy_level = energyMatch ? parseInt(energyMatch[1]) : null;
          const danceability = danceMatch ? parseInt(danceMatch[1]) : null;

          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'completed',
              ai_description: text,
              detected_genre,
              detected_mood,
              tempo_bpm,
              key_signature,
              detected_instruments,
              energy_level,
              danceability,
              metadata: result,
            })
            .eq('id', description.id);

          logger.info('🎉 Track description completed (Replicate)', {
            genre: detected_genre,
            mood: detected_mood,
            tempo: tempo_bpm,
          });

        } else if (result.status === 'failed') {
          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'failed',
              error_message: result.error || 'Analysis failed',
            })
            .eq('id', description.id);

        } else {
          // Still processing
          setTimeout(() => pollPrediction(attemptNumber + 1), 5000);
        }

      } catch (pollError) {
        logger.error('🔴 Replicate polling error', { error: pollError });
        setTimeout(() => pollPrediction(attemptNumber + 1), 5000);
      }
    }

    // Start background polling
    pollPrediction().catch((err) => {
      logger.error('🔴 Background polling failed', { error: err });
    });

    // 8. Return response
    return new Response(
      JSON.stringify({
        success: true,
        descriptionId: description.id,
        predictionId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    logger.error('🔴 Track description error (Replicate)', { error });
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Description failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
