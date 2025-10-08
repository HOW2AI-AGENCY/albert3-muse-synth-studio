import { createClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import { appEnv } from "@/config/env";
import type { Database } from "./types";
import { logError } from "@/utils/logger";

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

  try {
    const supabaseHost = new URL(appEnv.supabaseUrl).host;

    if (window.location.host === supabaseHost) {
      return { "x-app-environment": appEnv.appEnv };
    }
  } catch (error) {
    logError(
      "Failed to resolve Supabase URL when building headers",
      error instanceof Error ? error : new Error(String(error)),
      "SupabaseClient",
    );
  }

  return {};
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
