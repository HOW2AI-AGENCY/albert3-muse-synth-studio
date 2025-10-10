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

const PRIMARY_PROVIDER = 'suno';

export const useProviderBalance = () => {
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Skip invoking edge function if user is not authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        const unauthorizedMessage = 'Unauthorized: sign in to view balance';
        setError(unauthorizedMessage);
        setBalance({
          provider: PRIMARY_PROVIDER,
          balance: 0,
          currency: 'credits',
          error: unauthorizedMessage,
        });
        return;
      }

      const { data, error: invokeError } = await supabase.functions.invoke<ProviderBalance>(
        'get-balance',
        {
          body: { provider: PRIMARY_PROVIDER },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data) {
        throw new Error(`[${PRIMARY_PROVIDER}] пустой ответ от функции get-balance`);
      }

      if (data.error) {
        throw new Error(`[${PRIMARY_PROVIDER}] ${data.error}`);
      }

      setBalance(data);
      setError(null);
    } catch (fetchError) {
      const errorMessage = (fetchError as Error).message;
      setError(errorMessage);
      setBalance({
        provider: PRIMARY_PROVIDER,
        balance: 0,
        currency: 'credits',
        error: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBalance();

    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchBalance]);

  return { balance, isLoading, error, refetch: fetchBalance };
};
