import { useState, useEffect } from 'react';
import { ApiService } from '@/services/api.service';
import { useToast } from '@/hooks/use-toast';
import { logError, logInfo } from '@/utils/logger';
import { DollarSign, Zap } from 'lucide-react';

const ProviderBalance = () => {
  const [balance, setBalance] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        setIsLoading(true);
        setError(null);
        logInfo('Fetching provider balance...', 'ProviderBalance');
        const sunoBalance = await ApiService.getProviderBalance('suno');

        if (sunoBalance && typeof sunoBalance.balance === 'number' && !sunoBalance.error) {
          setBalance(sunoBalance.balance);
          logInfo('Suno balance fetched successfully', 'ProviderBalance', { balance: sunoBalance.balance });
        } else {
          // Fallback to Replicate if Suno fails or returns invalid data
          logInfo('Suno balance not available, trying Replicate...', 'ProviderBalance', { sunoError: sunoBalance?.error });
          const replicateBalance = await ApiService.getProviderBalance('replicate');
          if (replicateBalance && typeof replicateBalance.balance === 'number' && !replicateBalance.error) {
            setBalance(replicateBalance.balance);
            logInfo('Replicate balance fetched successfully', 'ProviderBalance', { balance: replicateBalance.balance });
          } else {
            throw new Error('Could not fetch balance from any provider.');
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        logError('Failed to fetch provider balance', err as Error, 'ProviderBalance');
        toast({
          title: 'Ошибка загрузки баланса',
          description: 'Не удалось получить информацию о балансе провайдера.',
          variant: 'destructive',
        });
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBalance();

    // Refresh balance every 5 minutes
    const intervalId = setInterval(fetchBalance, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 animate-pulse">
        <DollarSign className="h-4 w-4 text-muted-foreground" />
        <div className="w-12 h-4 bg-muted-foreground/50 rounded-md" />
      </div>
    );
  }

  // Show error state instead of hiding completely
  if (error || balance === null) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-destructive/10 border border-destructive/20 cursor-help" 
        title={error || 'Не удалось загрузить баланс'}
      >
        <DollarSign className="h-4 w-4 text-destructive" />
        <span className="text-xs text-destructive font-medium">
          Ошибка
        </span>
      </div>
    );
  }

  // Desktop version - full display
  return (
    <>
      <div 
        className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20" 
        title={`Кредитов на балансе: ${balance.toLocaleString()}`}
      >
        <Zap className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-gradient-primary">
          {balance.toLocaleString()}
        </span>
      </div>
      
      {/* Mobile version - icon only with tooltip */}
      <div 
        className="sm:hidden flex items-center gap-2 px-2 py-1.5 rounded-full bg-primary/10 border border-primary/20" 
        title={`${balance.toLocaleString()} кредитов`}
      >
        <Zap className="h-4 w-4 text-primary" />
      </div>
    </>
  );
};

export default ProviderBalance;
