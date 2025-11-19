import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";

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

const fetchBalance = async (): Promise<ProviderBalance> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.access_token) {
    throw new Error('Unauthorized: sign in to view balance');
  }

  const { data, error } = await SupabaseFunctions.invoke<ProviderBalance>(
    'get-balance',
    { body: { provider: PRIMARY_PROVIDER } }
  );

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error(`[${PRIMARY_PROVIDER}] пустой ответ от функции get-balance`);
  }

  if (data.error) {
    throw new Error(`[${PRIMARY_PROVIDER}] ${data.error}`);
  }

  return data;
};

export const useProviderBalance = () => {
  const {
    data: balance,
    isLoading,
    error,
    refetch
  } = useQuery<ProviderBalance>({
    queryKey: ['providerBalance', PRIMARY_PROVIDER],
    queryFn: fetchBalance,
    refetchInterval: 5 * 60 * 1000, // 5 minutes
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    balance,
    isLoading,
    error: error ? error.message : null,
    refetch
  };
};