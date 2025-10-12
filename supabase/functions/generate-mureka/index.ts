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
      logger.error('🔴 Authentication failed', authError || new Error('No user'), 'generate-mureka');
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

    logger.info('📝 Mureka generation request received', 'generate-mureka', {
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

    // 5. Generate music with Mureka
    const generatePayload = {
      prompt,
      lyrics,
      style: styleTags?.join(', '),
      model: modelVersion || 'o1-2024',
      bg_music: isBGM || false,
      output_audio_count: 2, // Generate 2 variants
    };

    logger.info('🎵 Calling Mureka generateSong API', 'generate-mureka', { payload: generatePayload });

    const { task_id, status } = await murekaClient.generateSong(generatePayload);

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
        metadata: {
          ...generatePayload,
          mureka_task_id: task_id,
          initial_status: status,
          started_at: new Date().toISOString(),
        },
      })
      .eq('id', finalTrackId);

    logger.info('✅ Mureka generation started', 'generate-mureka', {
      trackId: finalTrackId,
      taskId: task_id,
      status,
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
        
        logger.error('⏱️ Mureka polling timeout', new Error('Max attempts reached'), 'generate-mureka', {
          trackId: finalTrackId,
          taskId: task_id,
        });
        return;
      }

      try {
        const queryResult = await murekaClient.querySong({ task_id });
        
        logger.info('🔍 Mureka poll attempt', 'generate-mureka', {
          attempt: attemptNumber + 1,
          status: queryResult.status,
          taskId: task_id,
        });

        if (queryResult.status === 'completed' && queryResult.data?.length > 0) {
          const audioUrl = queryResult.data[0].audio_url;
          const coverUrl = queryResult.data[0].image_url;
          const duration = queryResult.data[0].duration || 0;

          await supabaseAdmin
            .from('tracks')
            .update({
              status: 'completed',
              audio_url: audioUrl,
              cover_url: coverUrl,
              duration_seconds: duration,
              lyrics: queryResult.data[0].lyric || lyrics,
              metadata: {
                mureka_task_id: task_id,
                completed_at: new Date().toISOString(),
                mureka_response: queryResult,
              },
            })
            .eq('id', finalTrackId);

          logger.info('🎉 Mureka generation completed', 'generate-mureka', {
            trackId: finalTrackId,
            audioUrl,
            duration,
          });

          // Create track versions for additional outputs
          if (queryResult.data.length > 1) {
            const versions = queryResult.data.slice(1).map((output, index) => ({
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
            logger.info('📦 Created track versions', 'generate-mureka', { count: versions.length });
          }

        } else if (queryResult.status === 'failed') {
          await supabaseAdmin
            .from('tracks')
            .update({
              status: 'failed',
              error_message: queryResult.error || 'Mureka generation failed',
            })
            .eq('id', finalTrackId);

          logger.error('❌ Mureka generation failed', new Error(queryResult.error || 'Unknown error'), 'generate-mureka');
          
        } else {
          // Still processing, schedule next poll
          setTimeout(() => pollMurekaCompletion(attemptNumber + 1), pollInterval);
        }

      } catch (pollError) {
        logger.error('🔴 Mureka polling error', pollError as Error, 'generate-mureka', {
          attempt: attemptNumber,
          taskId: task_id,
        });
        
        // Retry after delay
        setTimeout(() => pollMurekaCompletion(attemptNumber + 1), pollInterval);
      }
    }

    // Start background polling
    pollMurekaCompletion().catch((err) => {
      logger.error('🔴 Background polling failed', err as Error, 'generate-mureka');
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
    logger.error('🔴 Mureka generation error', error as Error, 'generate-mureka');
    
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
