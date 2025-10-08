import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseUserClient } from "../_shared/supabase.ts";

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = createCorsHeaders();
  const securityHeaders = createSecurityHeaders();

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: { ...corsHeaders, ...securityHeaders } });
  }

  try {
    // 1. Authenticate user
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Get provider from query params or request body
    const url = new URL(req.url);
    let provider = url.searchParams.get('provider');

    // If not in query params and method is POST, try reading from body
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

    // 3. Fetch balance based on provider
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

const getSunoBalance = async () => {
  const SUNO_API_KEY = Deno.env.get('SUNO_API_KEY');
  if (!SUNO_API_KEY) {
    return { provider: 'suno', balance: 0, error: 'API key not configured' };
  }

  const response = await fetch('https://studio-api.suno.ai/api/billing/info/', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${SUNO_API_KEY}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Suno API error:', response.status, errorText);
    // Return a soft error, so the frontend can try the next provider
    return { provider: 'suno', balance: 0, error: `Suno API error: ${response.status}`, details: errorText };
  }

  const data = await response.json();
  return {
    provider: 'suno',
    balance: data.total_credits_left || 0,
    currency: 'credits',
    plan: data.plan_type || 'unknown',
    monthly_limit: data.monthly_limit || 0,
    monthly_usage: data.monthly_usage || 0,
  };
};

const getReplicateBalance = async () => {
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

serve(handler);