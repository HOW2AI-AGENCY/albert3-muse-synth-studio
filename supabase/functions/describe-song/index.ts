/**
 * Mureka AI Track Description & Analysis
 * 
 * Analyzes tracks and provides AI-generated descriptions including:
 * - Genre, mood, tempo (BPM)
 * - Detected instruments
 * - Energy level, danceability, valence
 * 
 * @endpoint POST /functions/v1/describe-song
 * @auth Required (JWT)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createMurekaClient, type MurekaDescriptionResponse } from "../_shared/mureka.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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
      .select('audio_url, user_id')
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

    logger.info('📖 Track description request', {
      trackId,
      audioUrl: track.audio_url,
    });

    // 4. Initialize Mureka client
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    const murekaClient = createMurekaClient({ apiKey: murekaApiKey });

    // 5. Create description record (без загрузки файла)
    const { data: description, error: insertError } = await supabaseAdmin
      .from('song_descriptions')
      .insert({
        user_id: user.id,
        track_id: trackId,
        audio_file_url: track.audio_url,
        status: 'processing',
      })
      .select('id')
      .single();

    if (insertError || !description) {
      throw new Error('Failed to create description record');
    }

    // 6. Call Mureka describe API (используем прямой URL, НЕ загружаем файл)
    logger.info('🎼 Calling Mureka describe API', { audioUrl: track.audio_url });
    const describeResponse = await murekaClient.describeSong({ url: track.audio_url });
    const task_id = describeResponse.data.task_id;

    await supabaseAdmin
      .from('song_descriptions')
      .update({ mureka_task_id: task_id })
      .eq('id', description.id);

    logger.info('✅ Description task created', {
      descriptionId: description?.id,
      taskId: task_id,
    });

    // 9. Background polling
    async function pollDescription(attemptNumber = 0): Promise<void> {
      if (attemptNumber >= 30) {
        if (description) {
          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'failed',
              error_message: 'Analysis timeout',
            })
            .eq('id', description.id);
        }
        return;
      }

      try {
        const result = await murekaClient.queryTask(task_id) as MurekaDescriptionResponse;

        if (result.data.description && description) {
          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'completed',
              ai_description: result.data.description.text,
              detected_genre: result.data.description.genre,
              detected_mood: result.data.description.mood,
              tempo_bpm: result.data.description.tempo_bpm,
              key_signature: result.data.description.key,
              detected_instruments: result.data.description.instruments || [],
              energy_level: result.data.description.energy_level,
              danceability: result.data.description.danceability,
              valence: result.data.description.valence,
              metadata: result,
            })
            .eq('id', description.id);

          logger.info('🎉 Track description completed', {
            genre: result.data.description.genre,
            mood: result.data.description.mood,
            tempo: result.data.description.tempo_bpm,
          });

        } else if (result.code !== 200 && description) {
          await supabaseAdmin
            .from('song_descriptions')
            .update({
              status: 'failed',
              error_message: result.msg || 'Analysis failed',
            })
            .eq('id', description.id);

        } else {
          setTimeout(() => pollDescription(attemptNumber + 1), 10000);
        }

      } catch (pollError) {
        logger.error('🔴 Description polling error', { error: pollError });
        setTimeout(() => pollDescription(attemptNumber + 1), 10000);
      }
    }

    pollDescription().catch((err) => {
      logger.error('🔴 Background description polling failed', { error: err });
    });

    // 10. Return response
    return new Response(
      JSON.stringify({
        success: true,
        descriptionId: description.id,
        taskId: task_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    logger.error('🔴 Track description error', { error });
    
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
