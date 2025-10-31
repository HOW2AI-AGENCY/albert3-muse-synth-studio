/**
 * Suno Music Generation Edge Function
 * 
 * Simplified entry point using SunoGenerationHandler
 * All business logic moved to handler.ts for better maintainability
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient, createSupabaseUserClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { validateAndParse, generateSunoSchema } from "../_shared/zod-schemas.ts";
import { SunoGenerationHandler } from "./handler.ts";
import type { SunoGenerationParams } from "../_shared/types/generation.ts";

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    ...createCorsHeaders(req),
    ...createSecurityHeaders()
  };

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

    const token = authHeader.replace('Bearer ', '');
    const userClient = createSupabaseUserClient(token);
    const { data: { user }, error: userError } = await userClient.auth.getUser(token);

    if (userError || !user) {
      logger.error('🔴 Authentication failed', { error: userError ?? undefined });
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logger.info('✅ User authenticated', { userId: user.id });

    // 2. Parse and validate request
    const rawBody = await req.json();
    const validation = validateAndParse(generateSunoSchema, rawBody);
    
    if (!validation.success) {
      logger.warn('Invalid request payload', { errors: validation.errors.errors });
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request parameters', 
          details: validation.errors.errors.map(e => ({ 
            path: e.path.join('.'), 
            message: e.message 
          }))
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Transform to handler params
    const body = validation.data;
    const params: SunoGenerationParams = {
      trackId: body.trackId,
      title: body.title,
      prompt: body.prompt || '',
      lyrics: body.lyrics,
      styleTags: body.tags,
      hasVocals: body.hasVocals,
      modelVersion: body.model_version,
      idempotencyKey: body.idempotencyKey,
      make_instrumental: body.make_instrumental,
      wait_audio: body.wait_audio,
      customMode: body.customMode,
      negativeTags: body.negativeTags,
      vocalGender: body.vocalGender,
      styleWeight: body.styleWeight,
      weirdnessConstraint: body.weirdnessConstraint,
      audioWeight: body.audioWeight,
      referenceAudioUrl: body.referenceAudioUrl,
      referenceTrackId: body.referenceTrackId,
    };

    // 4. Initialize handler and generate
    const supabaseAdmin = createSupabaseAdminClient();
    const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
    if (!SUNO_API_KEY) {
      throw new Error('SUNO_API_KEY not configured');
    }

    // Get callback URL
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const normalisedSupabaseUrl = supabaseUrl ? supabaseUrl.replace(/\/$/, "") : null;
    const callbackUrlEnv = Deno.env.get('SUNO_CALLBACK_URL')?.trim();
    const callbackUrl = callbackUrlEnv && callbackUrlEnv.length > 0
      ? callbackUrlEnv
      : normalisedSupabaseUrl
        ? `${normalisedSupabaseUrl}/functions/v1/suno-callback`
        : null;

    const handler = new SunoGenerationHandler(supabaseAdmin, user.id, SUNO_API_KEY, callbackUrl);
    
    logger.info('🎵 Starting Suno generation', { userId: user.id, trackId: params.trackId });
    
    const result = await handler.generate(params);

    // 5. Return response
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🔴 Generate-suno error', { error });

    // Handle rate limiting and quota errors specifically
    if (error instanceof Error) {
      if (errorMsg.includes('429') || errorMsg.toLowerCase().includes('rate limit')) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Rate limit exceeded. Please try again in a few minutes.',
            errorCode: 'RATE_LIMIT_EXCEEDED',
            retryAfter: 60
          }),
          { 
            status: 429,
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json',
              'Retry-After': '60'
            }
          }
        );
      }
      
      if (errorMsg.includes('402') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('insufficient credits')) {
        return new Response(
          JSON.stringify({ 
            success: false,
            error: 'Insufficient credits. Please upgrade your plan.',
            errorCode: 'INSUFFICIENT_CREDITS'
          }),
          { 
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMsg,
        errorCode: 'INTERNAL_ERROR'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
