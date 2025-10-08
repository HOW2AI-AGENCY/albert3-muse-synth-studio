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

const clientOptions: SupabaseClientOptions<"public"> = {
  auth: {
    storage: resolveStorage(),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      "x-app-environment": appEnv.appEnv,
    },
  },
};

export const createSupabaseClient = () =>
  createClient<Database>(appEnv.supabaseUrl, appEnv.supabaseAnonKey, clientOptions);

export const supabase = createSupabaseClient();
