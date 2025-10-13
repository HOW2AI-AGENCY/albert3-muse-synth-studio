import { Coins, Loader2, AlertCircle } from "@/utils/iconImports";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useProviderBalance } from "@/hooks/useProviderBalance";

export const SunoBalanceDisplay = () => {
  const { balance, isLoading, error } = useProviderBalance();

  if (isLoading) {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        <span>Загрузка...</span>
      </Badge>
    );
  }

  if (error || !balance) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 text-[10px] text-destructive border-destructive/50">
              <AlertCircle className="w-2.5 h-2.5" />
              <span>Ошибка</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            <p>{error || 'Не удалось загрузить баланс'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const creditsLeft = balance.balance || 0;
  const isLowBalance = creditsLeft < 10;
  const isZeroBalance = creditsLeft === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isZeroBalance ? "destructive" : isLowBalance ? "outline" : "secondary"} 
            className={`gap-1 text-[10px] ${isLowBalance && !isZeroBalance ? 'border-yellow-500/50 text-yellow-600 dark:text-yellow-400' : ''}`}
          >
            <Coins className="w-2.5 h-2.5" />
            <span>{creditsLeft} {balance.currency === 'credits' ? 'кредитов' : balance.currency}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {isZeroBalance ? (
            <p className="text-destructive">❌ Недостаточно кредитов для генерации</p>
          ) : isLowBalance ? (
            <p className="text-yellow-600 dark:text-yellow-400">⚠️ Низкий баланс Suno</p>
          ) : (
            <p>💰 Баланс Suno: {creditsLeft} кредитов</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
