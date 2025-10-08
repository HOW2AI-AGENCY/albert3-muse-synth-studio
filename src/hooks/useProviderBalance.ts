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
  const [error, setError] = useState<string | null>(null);

  const fetchBalance = async () => {
    setIsLoading(true);
    setError(null);

    // Define providers in order of priority
    const providers = ['replicate', 'suno'];
    let finalBalance: ProviderBalance | null = null;

    for (const provider of providers) {
      try {
        console.log(`Fetching balance for provider: ${provider}`);
        const { data, error: invokeError } = await supabase.functions.invoke('get-balance', {
          queryString: { provider }
        });

        if (invokeError) {
          console.warn(`Failed to invoke balance function for ${provider}:`, invokeError.message);
          continue; // Try next provider
        }

        // The function returns a data object that is the balance response
        const providerBalance: ProviderBalance = data;

        // If the provider returns its own error field (e.g. Suno is down),
        // we log it and try the next provider.
        if (providerBalance.error) {
          console.warn(`Provider ${provider} returned an error:`, providerBalance.error);
          continue; // Try next provider
        }

        // Success! We found a working provider.
        finalBalance = providerBalance;
        break; // Exit loop

      } catch (e) {
        console.error(`Unexpected error fetching balance for ${provider}:`, e);
        // This is a network or unexpected error, try next provider
      }
    }

    if (finalBalance) {
      setBalance(finalBalance);
    } else {
      // If all providers failed
      const errorMessage = 'Could not fetch balance from any provider.';
      setError(errorMessage);
      setBalance({
        provider: 'unknown',
        balance: 0,
        currency: 'credits',
        error: errorMessage,
      });
    }

    setIsLoading(false);
  };

  useEffect(() => {
    fetchBalance();
    
    // Refresh balance every 5 minutes
    const interval = setInterval(fetchBalance, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  return { balance, isLoading, error, refetch: fetchBalance };
};
