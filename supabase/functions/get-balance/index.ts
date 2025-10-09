import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createCorsHeaders } from "../_shared/cors.ts";
import { createSecurityHeaders } from "../_shared/security.ts";
import { createSupabaseUserClient } from "../_shared/supabase.ts";

type SunoBalanceAttempt = {
  endpoint: string;
  status?: number;
  message: string;
};

const unique = (values: (string | undefined | null)[]): string[] => {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    const normalised = trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
    if (seen.has(normalised)) continue;
    seen.add(normalised);
    output.push(normalised);
  }
  return output;
};

const getSunoBalanceEndpoints = () => unique([
  Deno.env.get("SUNO_BALANCE_URL"),
  "https://studio-api.suno.ai/api/billing/info/",
  "https://api.sunoapi.org/api/v1/account/balance",
]);

const extractNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const extractString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
};

const parseSunoBalance = (payload: unknown) => {
  const containers: Record<string, unknown>[] = [];
  if (payload && typeof payload === "object") {
    containers.push(payload as Record<string, unknown>);

    const data = (payload as Record<string, unknown>).data;
    if (data && typeof data === "object") {
      containers.push(data as Record<string, unknown>);
    }

    const balanceNode = (payload as Record<string, unknown>).balance;
    if (balanceNode && typeof balanceNode === "object") {
      containers.push(balanceNode as Record<string, unknown>);
    }
  }

  let balance: number | null = null;
  let currency: string | null = null;
  let plan: string | null = null;

  for (const container of containers) {
    if (balance === null) {
      const candidate = extractNumber(
        container.balance ??
          (container as Record<string, unknown>).balance_credits ??
          (container as Record<string, unknown>).balanceCredits ??
          (container as Record<string, unknown>).credits ??
          (container as Record<string, unknown>).remaining_credits ??
          (container as Record<string, unknown>).remainingCredits ??
          (container as Record<string, unknown>).available_credits ??
          (container as Record<string, unknown>).availableCredits ??
          (container as Record<string, unknown>).credit_balance ??
          (container as Record<string, unknown>).credits_remaining ??
          (container as Record<string, unknown>).creditsRemaining ??
          (container as Record<string, unknown>).usage_balance,
      );
      if (candidate !== null) {
        balance = candidate;
      }
    }

    if (currency === null) {
      const candidate = extractString(
        container.currency ??
          (container as Record<string, unknown>).currency_code ??
          (container as Record<string, unknown>).currencyCode ??
          (container as Record<string, unknown>).plan_currency,
      );
      if (candidate) {
        currency = candidate;
      }
    }

    if (plan === null) {
      const candidate = extractString(
        container.plan ??
          (container as Record<string, unknown>).plan_name ??
          (container as Record<string, unknown>).planName ??
          (container as Record<string, unknown>).subscription ??
          (container as Record<string, unknown>).tier ??
          (container as Record<string, unknown>).plan_display_name,
      );
      if (candidate) {
        plan = candidate;
      }
    }

    if (balance !== null && currency && plan) {
      break;
    }
  }

  return { balance, currency, plan };
};

const fetchSunoBalanceFromEndpoint = async (
  endpoint: string,
  apiKey: string,
): Promise<{
  balance: number | null;
  currency: string | null;
  plan: string | null;
}> => {
  const response = await fetch(endpoint, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Accept": "application/json",
    },
  });

  const rawText = await response.text();
  let json: unknown = null;
  if (rawText) {
    try {
      json = JSON.parse(rawText);
    } catch (parseError) {
      throw Object.assign(new Error("Invalid JSON response from Suno balance endpoint"), {
        status: response.status,
        body: rawText,
        cause: parseError,
      });
    }
  }

  if (!response.ok) {
    const error = new Error(`Suno balance endpoint responded with status ${response.status}`);
    (error as Error & { status?: number; body?: string }).status = response.status;
    (error as Error & { status?: number; body?: string }).body = rawText;
    throw error;
  }

  const parsed = parseSunoBalance(json);
  if (parsed.balance === null) {
    const error = new Error("Suno balance response did not contain a numeric balance value");
    (error as Error & { status?: number; body?: string }).status = response.status;
    (error as Error & { status?: number; body?: string }).body = rawText;
    throw error;
  }

  return parsed;
};

export const getSunoBalance = async () => {
  const SUNO_API_KEY = Deno.env.get("SUNO_API_KEY");
  if (!SUNO_API_KEY) {
    return { provider: "suno", balance: 0, error: "API key not configured" };
  }

  const attempts: SunoBalanceAttempt[] = [];
  const endpoints = getSunoBalanceEndpoints();

  for (const endpoint of endpoints) {
    if (!endpoint) continue;
    try {
      const { balance, currency, plan } = await fetchSunoBalanceFromEndpoint(endpoint, SUNO_API_KEY);
      return {
        provider: "suno",
        balance: balance ?? 0,
        currency: currency ?? "credits",
        plan: plan ?? "unknown",
        endpoint,
      };
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      const message =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "Unknown error";
      console.error("Suno balance endpoint failed", { endpoint, status, message });
      attempts.push({ endpoint, status, message });
    }
  }

  if (!attempts.length) {
    return { provider: "suno", balance: 0, error: "No Suno balance endpoints configured" };
  }

  return {
    provider: "suno",
    balance: 0,
    error: "All Suno balance endpoints failed",
    attempts,
  };
};

export const getReplicateBalance = async () => {
  const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
  if (!REPLICATE_API_KEY) {
    return { provider: "replicate", balance: 0, error: "API key not configured" };
  }

  const response = await fetch("https://api.replicate.com/v1/account", {
    method: "GET",
    headers: { "Authorization": `Token ${REPLICATE_API_KEY}` },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Replicate API error:", response.status, errorText);
    return { provider: "replicate", balance: 0, error: `Replicate API error: ${response.status}` };
  }

  const data = await response.json();
  return {
    provider: "replicate",
    balance: 999,
    currency: "credits",
    plan: data.type || "unknown",
    message: "Balance cannot be fetched via API. Please check your Replicate dashboard.",
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();

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

if (import.meta.main) {
  serve(handler);
}
