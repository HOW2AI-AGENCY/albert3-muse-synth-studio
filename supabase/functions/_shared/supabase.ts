import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

/**
 * Shared helpers for configuring Supabase clients inside Edge Functions.
 * Normalises environment variable names and centralises error handling so
 * generation-related functions don't silently run without credentials.
 */

export const getSupabaseUrl = (): string => Deno.env.get("SUPABASE_URL") ?? "";

export const getSupabaseServiceRoleKey = (): string =>
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ?? Deno.env.get("SUPABASE_SERVICE_ROLE")
    ?? "";

export const getSupabaseAnonKey = (): string => Deno.env.get("SUPABASE_ANON_KEY") ?? "";

export const ensureSupabaseUrl = (): string => {
  const supabaseUrl = getSupabaseUrl();
  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is not configured");
  }
  return supabaseUrl;
};

export const ensureServiceRoleKey = (): string => {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error("Supabase service role credentials are not configured");
  }
  return serviceRoleKey;
};

export const ensureAnonKey = (): string => {
  const anonKey = getSupabaseAnonKey();
  if (!anonKey) {
    throw new Error("Supabase anonymous key is not configured");
  }
  return anonKey;
};

export const createSupabaseAdminClient = (): SupabaseClient => {
  const supabaseUrl = ensureSupabaseUrl();
  const serviceRoleKey = ensureServiceRoleKey();
  return createClient(supabaseUrl, serviceRoleKey);
};

export const createSupabaseUserClient = (token: string): SupabaseClient => {
  const supabaseUrl = ensureSupabaseUrl();
  const anonKey = ensureAnonKey();
  return createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
};
