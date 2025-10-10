import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseUserClient } from "../_shared/supabase.ts";
import { fetchSunoBalance } from "../_shared/suno-balance.ts";

export const getSunoBalance = async () => {
  const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
  if (!SUNO_API_KEY) {
    return { provider: 'suno', balance: 0, currency: 'credits', error: 'API key not configured' };
  }

  const result = await fetchSunoBalance({ apiKey: SUNO_API_KEY });

  if (result.success) {
    const currency = result.currency ?? 'credits';
    const details: Record<string, unknown> = {
      endpoint: result.endpoint,
      attempts: result.attempts,
    };

    if (result.monthly_limit !== undefined && result.monthly_usage !== undefined) {
      details.monthly_remaining = Math.max(0, result.monthly_limit - result.monthly_usage);
    }

    return {
      provider: 'suno',
      balance: result.balance,
      currency,
      plan: result.plan,
      monthly_limit: result.monthly_limit,
      monthly_usage: result.monthly_usage,
      details,
    };
  }

  console.error('Suno balance endpoint failed', { attempts: result.attempts });

  return {
    provider: 'suno',
    balance: 0,
    currency: 'credits',
    error: result.error,
    details: { attempts: result.attempts },
  };
};

export const getReplicateBalance = async () => {
  const REPLICATE_API_KEY = Deno.env.get('REPLICATE_API_KEY');
  if (!REPLICATE_API_KEY) {
    return { provider: 'replicate', balance: 0, error: 'API key not configured' };
  }

  const response = await fetch('https://api.replicate.com/v1/account', {
    method: 'GET',
    headers: { 'Authorization': `Token ${REPLICATE_API_KEY}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Replicate API error:', response.status, errorText);
    return { provider: 'replicate', balance: 0, error: `Replicate API error: ${response.status}` };
  }

  const data = await response.json();
  // NOTE: Replicate does not provide a direct balance API endpoint.
  // We are returning a placeholder value. The actual credit usage is tracked on their website.
  // For the purpose of this feature, we will return a static, non-zero value
  // to indicate the service is active, and the real balance should be checked on the Replicate website.
  return {
    provider: 'replicate',
    balance: 999, // Placeholder value
    currency: 'credits',
    plan: data.type || 'unknown',
    message: 'Balance cannot be fetched via API. Please check your Replicate dashboard.',
  };
};

export const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = createCorsHeaders(req);
  const securityHeaders = createSecurityHeaders();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');

    let supabase;
    try {
      supabase = createSupabaseUserClient(token);
    } catch (configError) {
      console.error('Supabase configuration error while creating auth client:', configError);
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    let provider = url.searchParams.get('provider');

    if (!provider && req.method === 'POST') {
      try {
        const body = await req.json();
        provider = body?.provider;
      } catch (e) {
        console.error('Failed to parse POST body:', e);
      }
    }

    if (!provider || (provider !== 'suno' && provider !== 'replicate')) {
      return new Response(JSON.stringify({ error: "Missing or invalid 'provider' parameter. Must be 'suno' or 'replicate'." }), {
        status: 400,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    let balanceResponse;

    if (provider === 'suno') {
      balanceResponse = await getSunoBalance();
    } else if (provider === 'replicate') {
      balanceResponse = await getReplicateBalance();
    }

    return new Response(JSON.stringify(balanceResponse), {
      status: 200,
      headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error(`Error in get-balance for provider:`, error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
    });
  }
};
serve(handler);
