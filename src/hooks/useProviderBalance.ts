import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProviderBalance {
  provider: string;
  balance: number;
  currency: string;
  plan?: string;
  monthly_limit?: number;
  monthly_usage?: number;
  error?: string;
}

export const useProviderBalance = () => {
  const [balance, setBalance] = useState<ProviderBalance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBalance = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('get-provider-balance');
      
      if (error) {
        console.error('Error fetching balance:', error);
        setBalance({
          provider: 'suno',
          balance: 0,
          currency: 'credits',
          error: error.message
        });
        return;
      }

      setBalance(data);
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance({
        provider: 'suno',
        balance: 0,
        currency: 'credits',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    
    // Refresh balance every 5 minutes
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { balance, isLoading, refetch: fetchBalance };
};
