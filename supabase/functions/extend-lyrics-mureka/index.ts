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
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
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

    // 4. Extend lyrics with Mureka (synchronous API)
    const extendPayload = {
      lyrics: existingLyrics,
      prompt: prompt || 'Continue the lyrics naturally',
    };

    logger.info('📝 Calling Mureka extendLyrics API', { payload: extendPayload });

    const response = await murekaClient.extendLyrics(extendPayload);
    
    // API returns { code, data: { lyrics, title } } synchronously
    const extendedLyrics = response.data?.lyrics;

    if (!extendedLyrics) {
      throw new Error('Mureka API did not return extended lyrics');
    }

    logger.info('✅ Lyrics extended successfully', { 
      originalLength: existingLyrics.length,
      extendedLength: extendedLyrics.length
    });

    // Return success response immediately (synchronous response)
    return new Response(
      JSON.stringify({
        success: true,
        lyrics: extendedLyrics,
        originalLength: existingLyrics.length,
        extendedLength: extendedLyrics.length,
      }),
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
