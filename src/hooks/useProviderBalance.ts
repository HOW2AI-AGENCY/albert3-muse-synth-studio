import { useState, useEffect, useCallback, useRef } from 'react';
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
  const inFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const requestSeqRef = useRef(0);

  const fetchBalance = useCallback(async () => {
    if (inFlightRef.current) {
      // Пропускаем, если предыдущий запрос ещё не завершён
      return;
    }
    inFlightRef.current = true;
    const seq = ++requestSeqRef.current;
    setIsLoading(true);
    setError(null);

    try {
      // Skip invoking edge function if user is not authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.access_token) {
        const unauthorizedMessage = 'Unauthorized: sign in to view balance';
        if (isMountedRef.current && seq === requestSeqRef.current) {
          setError(unauthorizedMessage);
          setBalance({
            provider: PRIMARY_PROVIDER,
            balance: 0,
            currency: 'credits',
            error: unauthorizedMessage,
          });
        }
        return;
      }

      const TIMEOUT_MS = 15000;
      const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('get-balance timeout')), TIMEOUT_MS));
      const invokePromise = supabase.functions.invoke<ProviderBalance>(
        'get-balance',
        { body: { provider: PRIMARY_PROVIDER } }
      );
      const { data, error: invokeError } = await Promise.race([invokePromise, timeout]) as any;

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (!data) {
        throw new Error(`[${PRIMARY_PROVIDER}] пустой ответ от функции get-balance`);
      }

      if (data.error) {
        throw new Error(`[${PRIMARY_PROVIDER}] ${data.error}`);
      }

      if (isMountedRef.current && seq === requestSeqRef.current) {
        setBalance(data);
        setError(null);
      }
  } catch (fetchError) {
      const errorMessage = (fetchError as Error).message || String(fetchError);
      const isAborted = /Abort/i.test(errorMessage) || /ERR_ABORTED/i.test(errorMessage);
      if (isMountedRef.current && seq === requestSeqRef.current) {
        if (isAborted) {
          // Тихо игнорируем прерванные запросы (например, при переключении страниц)
          // не сбрасываем баланс и не показываем ошибку
          setError(null);
        } else {
          setError(errorMessage);
          setBalance({
            provider: PRIMARY_PROVIDER,
            balance: 0,
            currency: 'credits',
            error: errorMessage,
          });
        }
      }
    } finally {
      if (isMountedRef.current && seq === requestSeqRef.current) {
        setIsLoading(false);
      }
      inFlightRef.current = false;
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    fetchBalance();

    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    return () => {
      isMountedRef.current = false;
      clearInterval(interval);
    };
  }, [fetchBalance]);

  return { balance, isLoading, error, refetch: fetchBalance };
};
