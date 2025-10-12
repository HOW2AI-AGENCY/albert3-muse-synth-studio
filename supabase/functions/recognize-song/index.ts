/**
 * Mureka Song Recognition (Shazam-like)
 * 
 * Identifies songs from audio files using Mureka AI
 * 
 * @endpoint POST /functions/v1/recognize-song
 * @auth Required (JWT)
 * @rateLimit 5 requests/minute
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createMurekaClient } from "../_shared/mureka.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RecognizeSongRequest {
  audioUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // 1. Authenticate user
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
    const { audioUrl }: RecognizeSongRequest = await req.json();
    
    if (!audioUrl) {
      throw new Error('audioUrl is required');
    }

    logger.info('🔍 Song recognition request', 'recognize-song', {
      userId: user.id,
      audioUrl,
    });

    // 3. Initialize Mureka client
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    const murekaClient = createMurekaClient({ apiKey: murekaApiKey });

    // 4. Download audio file
    logger.info('⬇️ Downloading audio file', 'recognize-song', { audioUrl });
    const audioResponse = await fetch(audioUrl);
    if (!audioResponse.ok) {
      throw new Error(`Failed to download audio: ${audioResponse.statusText}`);
    }
    
    const audioBlob = await audioResponse.blob();

    // 5. Upload to Mureka
    logger.info('⬆️ Uploading to Mureka', 'recognize-song');
    const { file_id } = await murekaClient.uploadFile(audioBlob, 'recognition-audio.mp3');

    // 6. Create recognition record
    const { data: recognition, error: insertError } = await supabaseAdmin
      .from('song_recognitions')
      .insert({
        user_id: user.id,
        audio_file_url: audioUrl,
        mureka_file_id: file_id,
        status: 'processing',
      })
      .select('id')
      .single();

    if (insertError || !recognition) {
      throw new Error('Failed to create recognition record');
    }

    // 7. Call Mureka recognition API
    logger.info('🎵 Calling Mureka recognition API', 'recognize-song', { fileId: file_id });
    const { task_id } = await murekaClient.recognizeSong({ file_id });

    // 8. Update record with task ID
    await supabaseAdmin
      .from('song_recognitions')
      .update({ mureka_task_id: task_id })
      .eq('id', recognition.id);

    logger.info('✅ Recognition task created', 'recognize-song', {
      recognitionId: recognition.id,
      taskId: task_id,
    });

    // 9. Start background polling
    async function pollRecognition(attemptNumber = 0): Promise<void> {
      if (attemptNumber >= 30) { // 5 minutes max (10s interval)
        await supabaseAdmin
          .from('song_recognitions')
          .update({
            status: 'failed',
            error_message: 'Recognition timeout',
          })
          .eq('id', recognition.id);
        return;
      }

      try {
        const result = await murekaClient.querySongRecognition({ task_id });

        if (result.status === 'completed' && result.data) {
          await supabaseAdmin
            .from('song_recognitions')
            .update({
              status: 'completed',
              recognized_title: result.data.title,
              recognized_artist: result.data.artist,
              recognized_album: result.data.album,
              release_date: result.data.release_date,
              confidence_score: result.data.confidence || 0.8,
              external_ids: result.data.external_ids || {},
              metadata: result,
            })
            .eq('id', recognition.id);

          logger.info('🎉 Song recognized', 'recognize-song', {
            title: result.data.title,
            artist: result.data.artist,
          });

        } else if (result.status === 'failed') {
          await supabaseAdmin
            .from('song_recognitions')
            .update({
              status: 'failed',
              error_message: 'Recognition failed',
            })
            .eq('id', recognition.id);

        } else {
          setTimeout(() => pollRecognition(attemptNumber + 1), 10000);
        }

      } catch (pollError) {
        logger.error('🔴 Recognition polling error', pollError as Error, 'recognize-song');
        setTimeout(() => pollRecognition(attemptNumber + 1), 10000);
      }
    }

    pollRecognition().catch((err) => {
      logger.error('🔴 Background recognition polling failed', err as Error, 'recognize-song');
    });

    // 10. Return immediate response
    return new Response(
      JSON.stringify({
        success: true,
        recognitionId: recognition.id,
        taskId: task_id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    logger.error('🔴 Song recognition error', error as Error, 'recognize-song');
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Recognition failed',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
