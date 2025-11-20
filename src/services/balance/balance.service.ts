import { supabase } from "@/integrations/supabase/client";
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { handleSupabaseFunctionError } from "@/services/api/errors";
import { logWarn } from "@/utils/logger";
import { startKpiTimer, endKpiTimer } from "@/utils/kpi";
import { recordPerformanceMetric } from "@/utils/performanceMonitor";

export interface ProviderBalanceResponse {
    provider: 'suno' | 'replicate';
    balance: number | null;
    currency?: 'credits' | 'usd';
    last_updated?: string;
    error?: string;
    has_free_tier?: boolean;
    usage_limit?: number;
    usage_today?: number;
  }

// Helper for tracking API requests
const trackAPIRequest = (
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
    error?: any
  ) => {
    recordPerformanceMetric('api_call', duration, 'BalanceService', {
      endpoint,
      method,
      statusCode,
      error: error ? (error.message || String(error)) : undefined
    });
  };

export class BalanceService {
  private static inFlightBalance: Map<string, Promise<ProviderBalanceResponse>> = new Map();
  private static lastBalanceCache: Map<string, ProviderBalanceResponse> = new Map();

  /**
   * Get provider balance
   */
  static async getProviderBalance(provider: 'suno' | 'replicate'): Promise<ProviderBalanceResponse> {
    const context = "BalanceService.getProviderBalance";

    const existing = BalanceService.inFlightBalance.get(provider);
    if (existing) return existing;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        logWarn("⚠️ [Balance Service] Skipping get-balance invoke: no user session", context, { provider });
        return {
          provider,
          balance: 0,
          currency: 'credits',
          error: 'Unauthorized: sign in to view balance',
        } as ProviderBalanceResponse;
      }
    } catch (sessionError) {
      logWarn("⚠️ [Balance Service] Failed to read session; returning fallback balance", context, { provider, sessionError: sessionError instanceof Error ? sessionError.message : String(sessionError) });
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
        BalanceService.lastBalanceCache.set(provider, data as ProviderBalanceResponse);
        return data as ProviderBalanceResponse;
      } catch (e) {
        endKpiTimer(timerId, 'api_latency', { endpoint: functionName, provider, aborted: true });
        const cached = BalanceService.lastBalanceCache.get(provider);
        if (cached) {
          logWarn('Returning cached provider balance due to error', context, { provider, error: e instanceof Error ? e.message : String(e) });
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
}
