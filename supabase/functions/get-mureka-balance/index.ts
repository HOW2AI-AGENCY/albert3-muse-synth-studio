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

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const murekaClient = createMurekaClient({ apiKey: murekaApiKey });
    
    logger.info('💰 Fetching Mureka balance');
    
    const billingData = await murekaClient.getBilling();
    
    // ✅ Phase 1: Проверка на undefined
    if (!billingData || !billingData.data) {
      logger.error('🔴 Invalid billing response from Mureka API', { error: 'Missing data field' });
      return new Response(
        JSON.stringify({
          balance: 0,
          currency: 'CNY',
          error: 'Invalid response from Mureka API',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    logger.info('✅ Mureka balance retrieved', {
      balance: billingData.data.balance,
      currency: billingData.data.currency,
    });

    return new Response(
      JSON.stringify({
        balance: billingData.data.balance,
        currency: billingData.data.currency,
        details: billingData.data,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
