import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { buildSunoHeaders } from "../_shared/suno.ts";
import { fetchSunoBalance } from "../_shared/suno-balance.ts";

type SunoBalanceAttempt = {
  endpoint: string;
  status?: number;
  message: string;
};

const unique = (values: Array<string | null | undefined>): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    if (!value) continue;

    const segments = value.split(",").map((segment) => segment.trim()).filter(Boolean);
    for (const segment of segments) {
      if (!segment) continue;
      const normalised = segment.endsWith('/') ? segment.slice(0, -1) : segment;
      if (!normalised) continue;
      if (!seen.has(normalised)) {
        seen.add(normalised);
        result.push(normalised);
      }
    }
  }
  return result;
};

const DEFAULT_SUNO_BALANCE_ENDPOINTS = unique([
  Deno.env.get('SUNO_BALANCE_URL'),
  'https://api.sunoapi.org/api/v1/generate/credit',
  'https://api.sunoapi.org/api/v1/account/balance',
  'https://studio-api.suno.ai/api/billing/info/',
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const coerceNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const numeric = Number(value.trim());
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
};

const coerceString = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
};

const getNestedValue = (root: Record<string, unknown>, path: string[]): unknown => {
  let current: unknown = root;
  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }
  return current;
};

const pickNumber = (root: Record<string, unknown>, paths: string[][]): number | undefined => {
  for (const path of paths) {
    const value = getNestedValue(root, path);
    const numeric = coerceNumber(value);
    if (numeric !== undefined) {
      return numeric;
    }
  }
  return undefined;
};

const pickString = (root: Record<string, unknown>, paths: string[][]): string | undefined => {
  for (const path of paths) {
    const value = getNestedValue(root, path);
    const stringValue = coerceString(value);
    if (stringValue) {
      return stringValue;
    }
  }
  return undefined;
};

const parseSunoBalanceResponse = (body: unknown): {
  balance: number;
  currency?: string;
  plan?: string;
  monthly_limit?: number;
  monthly_usage?: number;
} => {
  if (!isRecord(body)) {
    throw new Error('Unexpected response format');
  }

  const code = coerceNumber(body.code) ?? coerceNumber(body.status);
  const successMessage = coerceString(body.msg) ?? coerceString(body.message) ?? undefined;
  if (code !== undefined && code !== 200 && code !== 0) {
    throw new Error(successMessage ? `${successMessage} (code ${code})` : `Suno responded with code ${code}`);
  }

  const successFlag = body.success ?? body.ok ?? undefined;
  if (typeof successFlag === 'boolean' && successFlag === false) {
    throw new Error(successMessage ?? 'Suno balance request failed');
  }
  if (typeof successFlag === 'string' && successFlag.toLowerCase() === 'false') {
    throw new Error(successMessage ?? 'Suno balance request failed');
  }

  const balancePaths: string[][] = [
    ['balance'],
    ['data', 'balance'],
    ['data', 'data', 'balance'],
    ['data'],
    ['data', 'remaining'],
    ['data', 'remaining_creations'],
    ['data', 'credit_balance'],
    ['remaining_creations'],
    ['remainingCredits'],
    ['credits', 'balance'],
    ['credits', 'remaining'],
    ['credits', 'remaining_creations'],
    ['credits', 'monthly', 'remaining'],
    ['credits', 'monthly', 'remaining_creations'],
    ['usage', 'remaining'],
    ['billing', 'remaining'],
    ['data', 'credits', 'balance'],
    ['data', 'credits', 'remaining'],
    ['data', 'usage', 'remaining'],
    ['monthly_remaining'],
  ];

  const monthlyLimitPaths: string[][] = [
    ['monthly_limit'],
    ['data', 'monthly_limit'],
    ['data', 'data', 'monthly_limit'],
    ['credits', 'monthly_limit'],
    ['credits', 'monthly', 'limit'],
    ['subscription', 'monthly_limit'],
    ['limits', 'monthly'],
    ['usage', 'limit'],
    ['data', 'credits', 'monthly', 'limit'],
  ];

  const monthlyUsagePaths: string[][] = [
    ['monthly_usage'],
    ['data', 'monthly_usage'],
    ['data', 'data', 'monthly_usage'],
    ['credits', 'monthly_usage'],
    ['credits', 'monthly', 'used'],
    ['credits', 'monthly', 'usage'],
    ['usage', 'monthly'],
    ['usage', 'used'],
    ['data', 'credits', 'monthly', 'used'],
  ];

  const balance = pickNumber(body, balancePaths);
  const monthlyLimit = pickNumber(body, monthlyLimitPaths);
  const monthlyUsage = pickNumber(body, monthlyUsagePaths);

  let resolvedBalance = balance;
  if (resolvedBalance === undefined && monthlyLimit !== undefined && monthlyUsage !== undefined) {
    resolvedBalance = Math.max(0, monthlyLimit - monthlyUsage);
  }

  if (resolvedBalance === undefined) {
    throw new Error('Balance value missing in response');
  }

  const currency = pickString(body, [
    ['currency'],
    ['data', 'currency'],
    ['data', 'data', 'currency'],
    ['credits', 'currency'],
  ]);

  const plan = pickString(body, [
    ['plan'],
    ['data', 'plan'],
    ['subscription', 'plan'],
    ['subscription', 'name'],
    ['data', 'subscription', 'plan'],
  ]);

  return {
    balance: resolvedBalance,
    currency,
    plan,
    monthly_limit: monthlyLimit,
    monthly_usage: monthlyUsage,
  };
};

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

  // Use logger instead of console.error for consistency
  // console.error('Suno balance endpoint failed', { attempts: result.attempts });

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

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase credentials not configured' }), {
        status: 500,
        headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
