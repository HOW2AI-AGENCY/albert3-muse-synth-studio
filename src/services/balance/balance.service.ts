/**
 * Balance Service
 *
 * Handles provider balance operations with caching and deduplication.
 *
 * @module services/balance/balance.service
 * @since v2.6.3
 */

import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { supabase } from "@/integrations/supabase/client";
import { handleSupabaseFunctionError } from "@/services/api/errors";
import { logWarn } from "@/utils/logger";
import { startKpiTimer, endKpiTimer } from "@/utils/kpi";
import { trackAPIRequest } from "@/utils/sentry-enhanced";

export type ProviderBalanceResponse = {
  balance: number | null;
  error?: string | null;
} & Record<string, unknown>;

/**
 * Balance Service - handles provider balance operations
 */
export class BalanceService {
  // In-flight requests cache (prevents duplicate requests)
  private static inFlightBalance: Map<string, Promise<ProviderBalanceResponse>> = new Map();

  // Last successful response cache (fallback on errors)
  private static lastBalanceCache: Map<string, ProviderBalanceResponse> = new Map();

  /**
   * Get provider balance with caching and deduplication
   *
   * Features:
   * - Deduplicates concurrent requests for same provider
   * - Caches last successful response as fallback
   * - 15-second timeout
   * - Returns cached value on timeout/error
   *
   * @param provider - Provider to get balance for ('suno' or 'replicate')
   * @returns Promise with balance response
   *
   * @example
   * ```typescript
   * const balance = await BalanceService.getProviderBalance('suno');
   * console.log('Suno balance:', balance.balance);
   *
   * // Concurrent calls return same promise (deduplication)
   * const [balance1, balance2] = await Promise.all([
   *   BalanceService.getProviderBalance('suno'),
   *   BalanceService.getProviderBalance('suno')
   * ]);
   * // Only 1 API call made, both get same result
   * ```
   */
  static async getProviderBalance(provider: 'suno' | 'replicate'): Promise<ProviderBalanceResponse> {
    const context = "BalanceService.getProviderBalance";

    // Reuse in-flight request to prevent duplicates
    const existing = BalanceService.inFlightBalance.get(provider);
    if (existing) return existing;

    // Guard: don't call edge function without session
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        logWarn("⚠️ Skipping get-balance invoke: no user session", context, { provider });
        return {
          provider,
          balance: 0,
          currency: 'credits',
          error: 'Unauthorized: sign in to view balance',
        } as ProviderBalanceResponse;
      }
    } catch (sessionError) {
      logWarn("⚠️ Failed to read session; returning fallback balance", context, {
        provider,
        sessionError: sessionError instanceof Error ? sessionError.message : String(sessionError)
      });
      return {
        provider,
        balance: 0,
        currency: 'credits',
        error: 'Session check failed',
      } as ProviderBalanceResponse;
    }

    const functionName = `get-balance`;

    const requestPromise: Promise<ProviderBalanceResponse> = (async () => {
      const TIMEOUT_MS = 15000;

      // Implement timeout via promise race
      const timeout = new Promise<never>((_, reject) => {
        const id = setTimeout(() => reject(new Error('get-balance timeout')), TIMEOUT_MS);
        (timeout as any).id = id;
      });

      const timerId = `${context}:${provider}:${Date.now()}`;
      startKpiTimer(timerId);

      try {
        const invokePromise = SupabaseFunctions.invoke(functionName, { body: { provider } });
        const { data, error } = await Promise.race([invokePromise, timeout]) as any;
        const duration = endKpiTimer(timerId, 'api_latency', { endpoint: functionName, provider }) ?? 0;
        trackAPIRequest(functionName, 'POST', error ? 500 : 200, duration, error ?? undefined);

        if (error || !data) {
          return handleSupabaseFunctionError(
            error,
            `Failed to get balance for ${provider}`,
            context,
            { provider }
          );
        }

        // Cache successful response
        BalanceService.lastBalanceCache.set(provider, data as ProviderBalanceResponse);
        return data as ProviderBalanceResponse;
      } catch (e) {
        endKpiTimer(timerId, 'api_latency', { endpoint: functionName, provider, aborted: true });

        // Return cached balance on error if available
        const cached = BalanceService.lastBalanceCache.get(provider);
        if (cached) {
          logWarn('Returning cached provider balance due to error', context, {
            provider,
            error: e instanceof Error ? e.message : String(e)
          });
          return cached;
        }

        return handleSupabaseFunctionError(
          null,
          `Failed to get balance for ${provider}`,
          context,
          { provider }
        );
      } finally {
        const t: any = timeout as any;
        if (t.id) clearTimeout(t.id);
        BalanceService.inFlightBalance.delete(provider);
      }
    })();

    BalanceService.inFlightBalance.set(provider, requestPromise);
    return requestPromise;
  }

  /**
   * Clear cached balance for a provider
   *
   * @param provider - Provider to clear cache for
   *
   * @example
   * ```typescript
   * // After a purchase, clear cache to force refresh
   * await purchaseCredits('suno', 100);
   * BalanceService.clearCache('suno');
   * const newBalance = await BalanceService.getProviderBalance('suno');
   * ```
   */
  static clearCache(provider?: 'suno' | 'replicate'): void {
    if (provider) {
      BalanceService.lastBalanceCache.delete(provider);
      BalanceService.inFlightBalance.delete(provider);
    } else {
      BalanceService.lastBalanceCache.clear();
      BalanceService.inFlightBalance.clear();
    }
  }
}
