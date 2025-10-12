/**
 * Mureka AI Music Generation Edge Function
 * 
 * Generates music using Mureka O1 System API
 * Supports: multilingual prompts, BGM mode, custom lyrics, style tags
 * 
 * @endpoint POST /functions/v1/generate-mureka
 * @auth Required (JWT)
 * @rateLimit 10 requests/minute
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createMurekaClient } from "../_shared/mureka.ts";
import { logger } from "../_shared/logger.ts";
import { findOrCreateTrack } from "../_shared/track-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateMurekaRequest {
  trackId?: string;
  title?: string;
  prompt: string;
  lyrics?: string;
  styleTags?: string[];
  hasVocals?: boolean;
  isBGM?: boolean; // Mureka-specific: Background Music mode
  modelVersion?: string; // Mureka model version
  idempotencyKey?: string;
}

serve(async (req) => {
  // Handle CORS preflight
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
      logger.error('🔴 Authentication failed', { error: authError || new Error('No user') });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Parse and validate request body
    const body: GenerateMurekaRequest = await req.json();
    const { trackId, title, prompt, lyrics, styleTags, hasVocals, isBGM, modelVersion, idempotencyKey } = body;

    if (!prompt?.trim()) {
      throw new Error('Prompt is required');
    }

    logger.info('📝 Mureka generation request received', {
      userId: user.id,
      trackId,
      promptLength: prompt.length,
      hasLyrics: !!lyrics,
      isBGM,
      modelVersion,
    });

    // 3. Find or create track with provider='mureka'
    const { trackId: finalTrackId } = await findOrCreateTrack(
      supabaseAdmin,
      user.id,
      {
        trackId,
        title: title || prompt.substring(0, 50),
        prompt,
        lyrics,
        hasVocals,
        styleTags,
        requestMetadata: {
          provider: 'mureka',
          isBGM,
          modelVersion,
          originalRequest: { prompt, lyrics, styleTags },
        },
        idempotencyKey,
      }
    );

    // 4. Initialize Mureka client
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    const murekaClient = createMurekaClient({ apiKey: murekaApiKey });

    // ✅ FIX: Если лирика не передана, сначала генерируем её через /v1/lyrics/generate
    let finalLyrics = lyrics;
    
    if (!finalLyrics || finalLyrics.trim().length === 0) {
      logger.info('📝 No lyrics provided, generating lyrics from prompt');
      
      try {
        const lyricsResult = await murekaClient.generateLyrics({ prompt });
        
        if (lyricsResult.code === 200 && lyricsResult.data?.lyrics) {
          finalLyrics = lyricsResult.data.lyrics;
          logger.info('✅ Lyrics generated successfully', {
            lyricsLength: finalLyrics.length
          });
        } else {
          throw new Error('Failed to generate lyrics: ' + lyricsResult.msg);
        }
      } catch (lyricsError) {
        logger.error('🔴 Lyrics generation failed', { error: lyricsError });
        throw new Error('Failed to generate lyrics before song generation');
      }
    }

    // ✅ FIX: Правильный payload согласно документации Mureka API
    // https://platform.mureka.ai/docs/api/operations/post-v1-song-generate.html
    const generatePayload = {
      lyrics: finalLyrics,              // REQUIRED: Текст песни (обязательно)
      prompt: prompt || undefined,      // OPTIONAL: Контроль генерации музыки
      model: modelVersion || 'auto',    // auto | mureka-6 | mureka-7.5 | mureka-o1
      n: 2,                              // Количество вариантов (2-3)
    };

    logger.info('🎵 Calling Mureka generateSong API', { payload: generatePayload });

    const response = await murekaClient.generateSong(generatePayload);
    const task_id = response.data.task_id;

    if (!task_id) {
      throw new Error('Mureka API did not return task_id');
    }

    // 6. Update track with Mureka task ID
    await supabaseAdmin
      .from('tracks')
      .update({
        suno_id: task_id, // Reusing suno_id field for Mureka task_id
        status: 'processing',
        provider: 'mureka',
        lyrics: finalLyrics,        // ✅ Сохраняем итоговую лирику
        metadata: {
          originalPrompt: prompt,
          generatedLyrics: !lyrics, // Флаг что лирика была сгенерирована
          murekaModel: generatePayload.model,
          mureka_task_id: task_id,
          started_at: new Date().toISOString(),
        },
      })
      .eq('id', finalTrackId);

    logger.info('✅ Mureka generation started', {
      trackId: finalTrackId,
      taskId: task_id,
    });

    // 7. Start background polling (every 10s)
    const pollInterval = 10000; // 10 seconds
    const maxAttempts = 60; // 10 minutes max

    async function pollMurekaCompletion(attemptNumber = 0): Promise<void> {
      if (attemptNumber >= maxAttempts) {
        await supabaseAdmin
          .from('tracks')
          .update({
            status: 'failed',
            error_message: 'Mureka generation timeout after 10 minutes',
          })
          .eq('id', finalTrackId);
        
        logger.error('⏱️ Mureka polling timeout', {
          error: new Error('Max attempts reached'),
          trackId: finalTrackId,
          taskId: task_id,
        });
        return;
      }

      try {
        const queryResult = await murekaClient.queryTask(task_id);
        
        logger.info('🔍 Mureka poll attempt', {
          attempt: attemptNumber + 1,
          taskId: task_id,
        });

        const clips = queryResult.data?.clips;
        if (queryResult.code === 200 && clips && clips.length > 0) {
          const audioUrl = clips[0].audio_url;
          const coverUrl = clips[0].image_url;
          const duration = clips[0].duration || 0;

          await supabaseAdmin
            .from('tracks')
            .update({
              status: 'completed',
              audio_url: audioUrl,
              cover_url: coverUrl,
              duration_seconds: duration,
              lyrics: clips[0].lyrics || lyrics,
              metadata: {
                mureka_task_id: task_id,
                completed_at: new Date().toISOString(),
                mureka_response: queryResult,
              },
            })
            .eq('id', finalTrackId);

          logger.info('🎉 Mureka generation completed', {
            trackId: finalTrackId,
            audioUrl,
            duration,
          });

          // Create track versions for additional outputs
          if (clips.length > 1) {
            const versions = clips.slice(1).map((output: any, index: number) => ({
              parent_track_id: finalTrackId,
              version_number: index + 1,
              audio_url: output.audio_url,
              cover_url: output.image_url,
              duration: output.duration,
              lyrics: output.lyric,
              suno_id: output.id,
              metadata: { source: 'mureka-variant', variant_index: index + 1 },
            }));

            await supabaseAdmin.from('track_versions').insert(versions);
            logger.info('📦 Created track versions', { count: versions.length });
          }

        } else if (queryResult.code !== 200) {
          await supabaseAdmin
            .from('tracks')
            .update({
              status: 'failed',
              error_message: queryResult.msg || 'Mureka generation failed',
            })
            .eq('id', finalTrackId);

          logger.error('❌ Mureka generation failed', { error: new Error(queryResult.msg || 'Unknown error') });
          
        } else {
          // Still processing, schedule next poll
          setTimeout(() => pollMurekaCompletion(attemptNumber + 1), pollInterval);
        }

      } catch (pollError) {
        logger.error('🔴 Mureka polling error', {
          error: pollError,
          attempt: attemptNumber,
          taskId: task_id,
        });
        
        // Retry after delay
        setTimeout(() => pollMurekaCompletion(attemptNumber + 1), pollInterval);
      }
    }

    // Start background polling
    pollMurekaCompletion().catch((err) => {
      logger.error('🔴 Background polling failed', { error: err });
    });

    // 8. Return success response immediately
    return new Response(
      JSON.stringify({
        success: true,
        taskId: task_id,
        trackId: finalTrackId,
        message: 'Mureka generation started',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    logger.error('🔴 Mureka generation error', { error });
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
