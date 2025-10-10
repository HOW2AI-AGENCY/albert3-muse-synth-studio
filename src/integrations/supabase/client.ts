import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import { appEnv } from "@/config/env";
import type { Database } from "./types";

const resolveStorage = (): Storage | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    return window.localStorage;
  } catch (error) {
    console.error("Failed to access localStorage for Supabase auth", error);
    return undefined;
  }
};

const resolveGlobalHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") {
    return { "x-app-environment": appEnv.appEnv };
  }

  return {};
};

const normalizeHeaders = (init?: HeadersInit): Record<string, string> => {
  if (typeof Headers !== "undefined" && init instanceof Headers) {
    const headers = new Headers(init);
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  if (!init) {
    return {};
  }

  if (Array.isArray(init)) {
    const result: Record<string, string> = {};
    init.forEach(([key, value]) => {
      result[key] = value;
    });
    return result;
  }

  return init as Record<string, string>;
};

const clientOptions: SupabaseClientOptions<"public"> = {
  auth: {
    storage: resolveStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: resolveGlobalHeaders(),
  },
};

export const createSupabaseClient = () =>
  createClient<Database>(appEnv.supabaseUrl, appEnv.supabaseAnonKey, clientOptions);

export const supabase = createSupabaseClient();

const originalInvoke = supabase.functions.invoke.bind(supabase.functions);

const ensureAuthHeader = async (
  headers: Record<string, string>
): Promise<Record<string, string>> => {
  if (typeof window === "undefined") {
    return headers;
  }

  const hasAuthHeader = Object.keys(headers).some(
    (key) => key.toLowerCase() === "authorization"
  );

  if (hasAuthHeader) {
    return headers;
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return {
        ...headers,
        Authorization: `Bearer ${session.access_token}`,
      };
    }
  } catch (error) {
    console.warn(
      "Failed to attach Supabase auth header for edge function invoke",
      error
    );
  }

  return headers;
};

supabase.functions.invoke = (async (functionName, options = {}) => {
  const normalizedHeaders = normalizeHeaders(options.headers);
  const headersWithAuth = await ensureAuthHeader(normalizedHeaders);

  const headers =
    typeof window === "undefined"
      ? { ...headersWithAuth, "x-app-environment": appEnv.appEnv }
      : headersWithAuth;

  // Lightweight diagnostics to help track 401s on get-balance
  try {
    if (typeof window !== "undefined" && functionName.startsWith("get-balance")) {
      const method = (options as { method?: string }).method ?? "POST";
      const hasAuth = Object.keys(headers).some(
        (key) => key.toLowerCase() === "authorization"
      );
      // Do not log header contents to avoid exposing tokens
      console.debug("[Supabase.invoke] get-balance", { method, hasAuth });
    }
  } catch (_) {
    // no-op: diagnostics should never break invoke
  }

  return originalInvoke(functionName, {
    ...options,
    // Avoid adding custom headers in the browser to prevent CORS/preflight failures.
    // On server-side (SSR) we can include environment hint header if needed.
    headers,
  });
}) as typeof supabase.functions.invoke;
