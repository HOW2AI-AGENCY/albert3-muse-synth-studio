/**
 * Get Mureka AI API Balance
 * 
 * Retrieves current credit balance for Mureka AI account
 * 
 * @endpoint GET /functions/v1/get-mureka-balance
 * @auth Required (JWT)
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createMurekaClient } from "../_shared/mureka.ts";
import { logger } from "../_shared/logger.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { balanceCache, createCacheHeaders } from "../_shared/cache.ts";
import { checkRateLimit, rateLimitConfigs } from "../_shared/rate-limit.ts";

const corsHeaders = {
  ...createCorsHeaders(),
  ...createSecurityHeaders(),
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Extract user identifier
    const authHeader = req.headers.get('Authorization');
    const userId = authHeader ? authHeader.split(' ')[1]?.substring(0, 20) : 
                   req.headers.get('x-forwarded-for') || 'anonymous';

    // Check rate limit
    const { allowed, headers: rateLimitHeaders } = checkRateLimit(
      userId, 
      rateLimitConfigs.balance
    );

    if (!allowed) {
      logger.warn('Rate limit exceeded for Mureka balance check', { userId });
      return new Response(
        JSON.stringify({ 
          error: 'Too many requests. Please try again later.' 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            ...rateLimitHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
    const murekaApiKey = Deno.env.get('MUREKA_API_KEY');
    if (!murekaApiKey) {
      logger.info('⚠️ MUREKA_API_KEY not configured - returning mock balance');
      return new Response(
        JSON.stringify({
          balance: 0,
          currency: 'CNY',
          details: { configured: false },
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Check cache first
    const cacheKey = 'balance:mureka';
    const cachedBalance = balanceCache.get(cacheKey);
    
    if (cachedBalance) {
      logger.info('💰 Cache hit for Mureka balance');
      const cacheHeaders = createCacheHeaders({ maxAge: 60, staleWhileRevalidate: 300 });
      return new Response(
        JSON.stringify(cachedBalance),
        {
          status: 200,
          headers: { 
            ...corsHeaders,
            ...rateLimitHeaders,
            ...cacheHeaders,
            'Content-Type': 'application/json',
            'X-Cache': 'HIT',
          },
        }
      );
    }

    const murekaClient = createMurekaClient({ apiKey: murekaApiKey });
    
    logger.info('💰 Fetching Mureka balance');
    
    const billingData = await murekaClient.getBilling();
    
    logger.info('🔍 Mureka billing API response', { 
      rawResponse: billingData,
      hasData: !!billingData?.data,
      code: billingData?.code 
    });
    
    // ✅ Проверка разных форматов ответа Mureka API
    if (!billingData) {
      logger.error('🔴 No response from Mureka API', { error: 'Billing data is null/undefined' });
      return new Response(
        JSON.stringify({
          balance: 0,
          currency: 'CNY',
          error: 'No response from Mureka API',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Поддержка двух форматов ответа:
    // Формат 1: { code: 200, data: { balance, currency } }
    // Формат 2: { balance, currency } (прямой объект)
    const balanceData = billingData.data || billingData;
    
    if (!balanceData.balance && balanceData.balance !== 0) {
      logger.error('🔴 Invalid billing response structure', { 
        error: 'Missing balance field',
        receivedKeys: Object.keys(balanceData)
      });
      return new Response(
        JSON.stringify({
          balance: 0,
          currency: 'CNY',
          error: 'Invalid response structure from Mureka API',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    logger.info('✅ Mureka balance retrieved', {
      balance: balanceData.balance,
      currency: balanceData.currency || 'CNY',
    });

    const responseData = {
      balance: balanceData.balance,
      currency: balanceData.currency || 'CNY',
      details: balanceData,
    };

    // Cache the response for 5 minutes
    balanceCache.set(cacheKey, responseData, 300);

    const cacheHeaders = createCacheHeaders({ maxAge: 60, staleWhileRevalidate: 300 });
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { 
          ...corsHeaders,
          ...rateLimitHeaders,
          ...cacheHeaders,
          'Content-Type': 'application/json',
          'X-Cache': 'MISS',
        },
      }
    );

  } catch (error) {
    logger.error('🔴 Failed to fetch Mureka balance', { error });
    
    return new Response(
      JSON.stringify({
        balance: 0,
        currency: 'CNY',
        error: error instanceof Error ? error.message : 'Failed to fetch balance',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
