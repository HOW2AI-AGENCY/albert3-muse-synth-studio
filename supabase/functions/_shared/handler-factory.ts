import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSecurityHeaders } from "./security.ts";
import { createCorsHeaders } from "./cors.ts";
import { createSupabaseUserClient } from "./supabase.ts";
import { logger } from "./logger.ts";
import { validateAndParse } from "./zod-schemas.ts";
import { rateLimiter, rateLimitConfigs, RateLimitType } from "./rate-limit.ts";

interface HandlerOptions<T = any> {
  schema: any;
  rateLimit: RateLimitType;
  handler: (data: T, user: any) => Promise<Response>;
}

/**
 * Фабрика для создания аутентифицированных обработчиков Edge Function.
 * Инкапсулирует общую логику: CORS, аутентификация, rate limiting, валидация.
 */
export function createAuthenticatedHandler<T>(options: HandlerOptions<T>) {
  return serve(async (req: Request): Promise<Response> => {
    const corsHeaders = {
      ...createCorsHeaders(req),
      ...createSecurityHeaders()
    };

    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 1. Authenticate user
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) throw new Error('Missing authorization header');
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

      // 2. Rate Limiting
      const rateLimitConfig = rateLimitConfigs[options.rateLimit];
      const rateLimitResult = rateLimiter.check(user.id, rateLimitConfig);
      if (!rateLimitResult.allowed) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // 3. Parse and validate
      const rawBody = await req.json();
      const validation = validateAndParse(options.schema, rawBody);
      if (!validation.success) {
        return new Response(JSON.stringify({ error: 'Invalid request', details: validation.errors.errors }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // 4. Execute business logic
      return await options.handler(validation.data as T, user);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
      logger.error('🔴 Unhandled error in handler', { error: error, errorMessage: errorMessage });
      return new Response(JSON.stringify({ error: errorMessage }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  });
}
