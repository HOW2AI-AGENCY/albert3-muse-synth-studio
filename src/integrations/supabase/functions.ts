/**
 * Supabase Functions Wrapper
 *
 * Clean wrapper around Supabase Edge Functions with automatic auth header injection,
 * centralized logging, and error handling.
 *
 * @module integrations/supabase/functions
 * @since v2.6.3
 *
 * @example
 * ```typescript
 * import { SupabaseFunctions } from '@/integrations/supabase/functions';
 *
 * const { data, error } = await SupabaseFunctions.invoke('get-balance', {
 *   body: { provider: 'suno' }
 * });
 * ```
 */

import { supabase } from './client';
import { logger } from '@/utils/logger';
import { appEnv } from '@/config/env';

interface InvokeOptions<T = unknown> {
  headers?: HeadersInit;
  body?: T;
  method?: string;
}

interface InvokeResponse<T> {
  data: T | null;
  error: Error | null;
}

/**
 * Supabase Edge Functions wrapper with automatic auth injection
 */
export class SupabaseFunctions {
  /**
   * Invokes a Supabase Edge Function with automatic auth header injection
   *
   * @param functionName - Name of the edge function to invoke
   * @param options - Function invocation options (headers, body, method)
   * @returns Promise with data and error
   *
   * @example
   * ```typescript
   * const { data, error } = await SupabaseFunctions.invoke('generate-suno', {
   *   body: { prompt: 'upbeat electronic music', provider: 'suno' }
   * });
   *
   * if (error) {
   *   console.error('Generation failed:', error);
   *   return;
   * }
   *
   * console.log('Track ID:', data.trackId);
   * ```
   */
  static async invoke<TResponse = unknown, TBody = unknown>(
    functionName: string,
    options: InvokeOptions<TBody> = {}
  ): Promise<InvokeResponse<TResponse>> {
    const normalizedHeaders = this.normalizeHeaders(options.headers);
    const headersWithAuth = await this.ensureAuthHeader(normalizedHeaders);

    const headers = typeof window === "undefined"
      ? { ...headersWithAuth, "x-app-environment": appEnv.appEnv }
      : headersWithAuth;

    // Centralized logging
    this.logInvocation(functionName, options.method ?? 'POST', headers);

    // Call original Supabase function
    return supabase.functions.invoke<TResponse>(functionName, {
      body: options.body,
      headers,
    } as any);
  }

  /**
   * Normalizes headers to Record<string, string> format
   * Handles Headers object, array of tuples, and plain objects
   *
   * @param init - Headers in any format
   * @returns Normalized headers object
   */
  private static normalizeHeaders(init?: HeadersInit): Record<string, string> {
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
  }

  /**
   * Ensures Authorization header is present by fetching current session
   * If header already exists, returns headers unchanged
   *
   * @param headers - Current headers
   * @returns Headers with Authorization added (if available)
   */
  private static async ensureAuthHeader(
    headers: Record<string, string>
  ): Promise<Record<string, string>> {
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
      logger.warn('Failed to attach auth header for edge function', 'SupabaseFunctions', {
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return headers;
  }

  /**
   * Logs edge function invocation for debugging
   * Only logs in browser environment
   *
   * @param functionName - Name of function being invoked
   * @param method - HTTP method
   * @param headers - Request headers
   */
  private static logInvocation(
    functionName: string,
    method: string,
    headers: Record<string, string>
  ): void {
    if (typeof window === "undefined") {
      return;
    }

    const hasAuth = Object.keys(headers).some(
      (key) => key.toLowerCase() === "authorization"
    );

    logger.debug(`Edge Function: ${functionName}`, 'SupabaseFunctions', {
      method,
      hasAuth,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Convenient alias for SupabaseFunctions
 *
 * @example
 * ```typescript
 * import { functions } from '@/integrations/supabase/functions';
 *
 * const { data, error } = await functions.invoke('get-balance', {
 *   body: { provider: 'suno' }
 * });
 * ```
 */
export const functions = SupabaseFunctions;
