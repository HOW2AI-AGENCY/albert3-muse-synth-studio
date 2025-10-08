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
    logError("Failed to access localStorage for Supabase auth", error instanceof Error ? error : new Error(String(error)), "SupabaseClient");
    return undefined;
  }
};

const resolveGlobalHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") {
    return { "x-app-environment": appEnv.appEnv };
  }

  return {};
};

const withAppEnvironmentHeader = (init?: HeadersInit): HeadersInit => {
  if (typeof Headers !== "undefined") {
    const headers = new Headers(init ?? {});
    headers.set("x-app-environment", appEnv.appEnv);
    return headers;
  }

  if (!init) {
    return { "x-app-environment": appEnv.appEnv };
  }

  if (Array.isArray(init)) {
    return [...init, ["x-app-environment", appEnv.appEnv]] as HeadersInit;
  }

  return {
    ...(init as Record<string, string>),
    "x-app-environment": appEnv.appEnv,
  };
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

supabase.functions.invoke = (async (functionName, options = {}) =>
  originalInvoke(functionName, {
    ...options,
    headers: withAppEnvironmentHeader(options.headers),
  })) as typeof supabase.functions.invoke;
