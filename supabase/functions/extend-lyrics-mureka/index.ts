/**
 * Mureka AI Lyrics Extension Edge Function
 * 
 * Extends existing lyrics using Mureka AI
 * 
 * @endpoint POST /functions/v1/extend-lyrics-mureka
 * @auth Required (JWT)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { createMurekaClient } from "../_shared/mureka.ts";
import { logger } from "../_shared/logger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExtendLyricsRequest {
  existingLyrics: string;
  prompt?: string;
  targetLength?: number;
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
    const { existingLyrics, prompt, targetLength }: ExtendLyricsRequest = await req.json();
    
    if (!existingLyrics?.trim()) {
      throw new Error('existingLyrics is required');
    }

    logger.info('🎤 Lyrics extension request', {
      userId: user.id,
      existingLength: existingLyrics.length,
      targetLength,
    });

    // 3. Initialize Mureka client
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    const murekaClient = createMurekaClient({ apiKey: murekaApiKey });

    // 4. Extend lyrics with Mureka
    const extendPayload = {
      lyrics: existingLyrics,
      prompt: prompt || 'Continue the lyrics naturally',
    };

    logger.info('📝 Calling Mureka extendLyrics API', { payload: extendPayload });

    const response = await murekaClient.extendLyrics(extendPayload);
    const task_id = response.data.task_id;

    if (!task_id) {
      throw new Error('Mureka API did not return task_id');
    }

    logger.info('✅ Lyrics extension started', { taskId: task_id });

    // 5. Poll for completion
    const pollInterval = 5000; // 5 seconds
    const maxAttempts = 24; // 2 minutes max

    async function pollLyricsCompletion(attemptNumber = 0): Promise<any> {
      if (attemptNumber >= maxAttempts) {
        throw new Error('Lyrics extension timeout');
      }

      try {
        const queryResult = await murekaClient.queryTask(task_id);
        
        if (queryResult.code === 200 && queryResult.data?.clips && queryResult.data.clips.length > 0) {
          const firstClip = queryResult.data.clips[0];
          logger.info('🎉 Lyrics extension completed', {
            lyricsLength: firstClip.lyrics?.length || 0,
          });
          
          return {
            success: true,
            taskId: task_id,
            lyrics: firstClip.lyrics || existingLyrics,
          };
        } else if (queryResult.code !== 200) {
          throw new Error(queryResult.msg || 'Lyrics extension failed');
        } else {
          // Still processing
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          return pollLyricsCompletion(attemptNumber + 1);
        }

      } catch (pollError) {
        logger.error('🔴 Lyrics polling error', { error: pollError });
        throw pollError;
      }
    }

    const result = await pollLyricsCompletion();

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    logger.error('🔴 Lyrics extension error', { error });
    
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
