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
    // Using dynamic import to avoid circular dependencies
    import('@/utils/logger').then(({ logger }) => {
      logger.error('Failed to access localStorage for Supabase auth', error instanceof Error ? error : new Error(String(error)), 'SupabaseClient');
    });
    return undefined;
  }
};

const resolveGlobalHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") {
    return { "x-app-environment": appEnv.appEnv };
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

/**
 * Supabase client instance
 *
 * @example
 * ```typescript
 * import { supabase } from '@/integrations/supabase/client';
 *
 * // Database operations
 * const { data, error } = await supabase
 *   .from('tracks')
 *   .select('*')
 *   .eq('user_id', userId);
 *
 * // For Edge Functions, use SupabaseFunctions wrapper instead:
 * import { SupabaseFunctions } from '@/integrations/supabase/functions';
 * const { data, error } = await SupabaseFunctions.invoke('get-balance', {
 *   body: { provider: 'suno' }
 * });
 * ```
 */
export const supabase = createSupabaseClient();
