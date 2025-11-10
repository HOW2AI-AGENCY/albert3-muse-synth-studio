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
    const { data: description, error: upsertError } = await supabaseAdmin
      .from('song_descriptions')
      .upsert({
        user_id: user.id,
        track_id: trackId,
        audio_file_url: track.audio_url,
        status: 'processing',
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

    // 6. Call Mureka describe API (используем прямой URL, НЕ загружаем файл)
    logger.info('🎼 Calling Mureka describe API', { audioUrl: track.audio_url });
    const describeResponse: any = await murekaClient.describeSong({ url: track.audio_url });

    // Handle both response shapes: task-based or immediate description
    let task_id: string | null = null;
    if (describeResponse?.data?.task_id) {
      task_id = describeResponse.data.task_id;
    } else if (typeof describeResponse?.task_id === 'string') {
      task_id = describeResponse.task_id as string;
    }

    if (task_id) {
      await supabaseAdmin
        .from('song_descriptions')
        .update({ mureka_task_id: task_id })
        .eq('id', description.id);

      logger.info('✅ Description task created', {
        descriptionId: description?.id,
        taskId: task_id,
      });
    } else {
      // Immediate description response - update record and finish
      const desc = describeResponse?.data?.description || describeResponse;
      const ai_description = desc?.text || desc?.description || null;
      const detected_genre = desc?.genre || (Array.isArray(desc?.genres) ? desc.genres[0] : null);
      const detected_mood = desc?.mood || (Array.isArray(desc?.tags) ? desc.tags[0] : null);
      const detected_instruments = desc?.instruments || desc?.instrument || [];

      await supabaseAdmin
        .from('song_descriptions')
        .update({
          status: 'completed',
          ai_description,
          detected_genre,
          detected_mood,
          tempo_bpm: desc?.tempo_bpm ?? null,
          key_signature: desc?.key ?? null,
          detected_instruments,
          energy_level: desc?.energy_level ?? null,
          danceability: desc?.danceability ?? null,
          valence: desc?.valence ?? null,
          metadata: describeResponse,
        })
        .eq('id', description.id);

      logger.info('✅ Description completed immediately (no task_id)', {
        descriptionId: description?.id,
        genre: detected_genre,
        mood: detected_mood,
      });
    }

    // 9. Background polling
    async function pollDescription(taskId: string, attemptNumber = 0): Promise<void> {
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
        const result = await murekaClient.queryTask(taskId) as MurekaDescriptionResponse;

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
          setTimeout(() => pollDescription(taskId, attemptNumber + 1), 10000);
        }

      } catch (pollError) {
        logger.error('🔴 Description polling error', { error: pollError });
        setTimeout(() => pollDescription(taskId, attemptNumber + 1), 10000);
      }
    }

    if (task_id) {
      pollDescription(task_id).catch((err) => {
        logger.error('🔴 Background description polling failed', { error: err });
      });
    }

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
