import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BoostStyleResponse {
  success: boolean;
  result: string;
  creditsConsumed: number;
  creditsRemaining: number;
  taskId: string;
}

interface BoostStyleError {
  error: string;
  code?: number;
  details?: string;
}

export const useBoostStyle = () => {
  const [isBoosting, setIsBoosting] = useState(false);
  const { toast } = useToast();

  const boostStyle = async (content: string): Promise<string | null> => {
    if (!content.trim()) {
      toast({
        title: 'Empty style',
        description: 'Please enter a style description to boost',
        variant: 'destructive'
      });
      return null;
    }

    setIsBoosting(true);
    try {
      const { data, error } = await supabase.functions.invoke<BoostStyleResponse | BoostStyleError>('boost-style', {
        body: { content: content.trim() }
      });

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error('No response from boost service');
      }

      // Check if response is an error
      if ('error' in data) {
        throw new Error(data.error);
      }

      // Success response
      toast({
        title: '✨ Style Enhanced',
        description: `Credits used: ${data.creditsConsumed} | Remaining: ${data.creditsRemaining}`
      });

      return data.result;
    } catch (error: any) {
      import('@/utils/logger').then(({ logError }) => {
        logError('Boost style failed', error, 'useBoostStyle', {
          contentLength: content.length
        });
      });
      
      let errorMessage = 'Failed to boost style';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.error) {
        errorMessage = error.error;
      }

      toast({
        title: 'Boost failed',
        description: errorMessage,
        variant: 'destructive'
      });
      
      return null;
    } finally {
      setIsBoosting(false);
    }
  };

  return { boostStyle, isBoosting };
};
