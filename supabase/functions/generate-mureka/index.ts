/**
 * Mureka AI Music Generation Edge Function
 * 
 * Simplified entry point using MurekaGenerationHandler
 * All business logic moved to handler.ts for better maintainability
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSupabaseAdminClient } from "../_shared/supabase.ts";
import { logger } from "../_shared/logger.ts";
import { validateAndParse, uuidSchema } from "../_shared/zod-schemas.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { MurekaGenerationHandler } from "./handler.ts";
import type { MurekaGenerationParams } from "../_shared/types/generation.ts";
import { checkRateLimit, rateLimitConfigs, createRateLimitHeaders } from "../_shared/rate-limit.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

serve(async (req: Request): Promise<Response> => {
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

    logger.info('✅ User authenticated', { userId: user.id });

    // 2. Check rate limit
    const { allowed, headers: rateLimitHeaders, result: rateLimitResult } = checkRateLimit(
      user.id,
      rateLimitConfigs.generation
    );

    if (!allowed) {
      logger.warn('⚠️ Rate limit exceeded for Mureka generation', { 
        userId: user.id,
        limit: rateLimitResult.limit,
        resetAt: new Date(rateLimitResult.resetAt).toISOString()
      });

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Слишком много запросов на генерацию. Попробуйте позже.',
          resetAt: new Date(rateLimitResult.resetAt).toISOString(),
          limit: rateLimitResult.limit,
          remaining: rateLimitResult.remaining,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    logger.info('✅ Rate limit check passed', { 
      userId: user.id, 
      remaining: rateLimitResult.remaining,
      limit: rateLimitResult.limit 
    });

    // 3. Parse and validate request
    const rawBody = await req.json();

    const generateMurekaSchema = z.object({
      trackId: uuidSchema.optional(),
      title: z.string().max(200).optional(),
      prompt: z.string().min(1).max(3000).trim(),
      lyrics: z.string().max(3000).nullable().optional(),
      styleTags: z.array(z.string().max(50)).max(20).optional(),
      hasVocals: z.boolean().optional(),
      isBGM: z.boolean().optional(),
      modelVersion: z.string().max(50).optional(),
      idempotencyKey: uuidSchema.optional(),
    });

    const validation = validateAndParse(generateMurekaSchema, rawBody);
    if (!validation.success) {
      logger.warn('Invalid Mureka request payload', { errors: validation.errors.errors });
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
    const params: MurekaGenerationParams = {
      trackId: body.trackId,
      title: body.title,
      prompt: body.prompt,
      lyrics: body.lyrics,
      styleTags: body.styleTags,
      hasVocals: body.hasVocals,
      modelVersion: body.modelVersion,
      idempotencyKey: body.idempotencyKey,
      isBGM: body.isBGM,
    };

    // 4. Initialize handler and generate
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      throw new Error('MUREKA_API_KEY not configured');
    }

    const handler = new MurekaGenerationHandler(supabaseAdmin, user.id, murekaApiKey);
    
    logger.info('📝 Starting Mureka generation', { 
      userId: user.id, 
      trackId: params.trackId,
      isBGM: params.isBGM
    });
    
    const result = await handler.generate(params);

    // 5. Return response with rate limit headers
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          ...corsHeaders, 
          ...rateLimitHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    logger.error('🔴 Generate-mureka error', { error });

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
