import { memo } from 'react';
import { Loader2, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useSunoBalance } from '@/hooks/useSunoBalance';

export const SunoBalanceDisplay = memo(() => {
  const { data: balance, isLoading, error } = useSunoBalance();

  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="destructive" className="text-[10px] sm:text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            Error
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Не удалось загрузить баланс</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isLoading) {
    return (
      <Badge variant="secondary" className="text-[10px] sm:text-xs">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        Loading...
      </Badge>
    );
  }

  const balanceValue = balance?.balance ?? 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant={balanceValue > 0 ? "default" : "destructive"}
          className="text-[10px] sm:text-xs font-medium"
        >
          <DollarSign className="h-3 w-3 mr-1" />
          {balanceValue.toFixed(2)}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>Баланс Suno: ${balanceValue.toFixed(2)}</p>
      </TooltipContent>
    </Tooltip>
  );
});

SunoBalanceDisplay.displayName = 'SunoBalanceDisplay';
