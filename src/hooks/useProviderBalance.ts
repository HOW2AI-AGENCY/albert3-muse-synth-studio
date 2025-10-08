import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProviderBalance {
  provider: string;
  balance: number;
  currency: string;
  plan?: string;
  monthly_limit?: number;
  monthly_usage?: number;
  error?: string;
  [key: string]: unknown;
}

const PROVIDER_PRIORITY: readonly string[] = ['suno', 'replicate'];

export const useProviderBalance = () => {
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const providerErrors: string[] = [];
    let fetchedBalance: ProviderBalance | null = null;

    for (const provider of PROVIDER_PRIORITY) {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke<ProviderBalance>('get-balance', {
          body: { provider }
        });

        if (invokeError) {
          providerErrors.push(`[${provider}] ${invokeError.message}`);
          continue;
        }

        if (!data) {
          providerErrors.push(`[${provider}] пустой ответ от функции get-balance`);
          continue;
        }

        if (data.error) {
          providerErrors.push(`[${provider}] ${data.error}`);
          continue;
        }

        fetchedBalance = data;
        break;
      } catch (fetchError) {
        providerErrors.push(`[${provider}] ${(fetchError as Error).message}`);
      }
    }

    if (fetchedBalance) {
      setBalance(fetchedBalance);
      setError(null);
    } else {
      const combinedError = providerErrors.join('; ') || 'Не удалось получить баланс провайдеров.';
      setError(combinedError);
      setBalance({
        provider: 'unknown',
        balance: 0,
        currency: 'credits',
        error: combinedError,
      });
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchBalance();

    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, isLoading, error, refetch: fetchBalance };
};
