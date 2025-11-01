import { Coins, Loader2, AlertCircle } from "@/utils/iconImports";
import { cn } from "@/lib/utils";
import { useProviderBalance } from "@/hooks/useProviderBalance";

export const SunoBalanceDisplay = () => {
  const { balance, isLoading, error } = useProviderBalance();

  if (isLoading) {
    return (
      <div className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-muted/30">
        <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground animate-spin" />
        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">...</span>
      </div>
    );
  }

  if (error || !balance) {
    return (
      <div 
        className="flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-muted/30" 
        title="Suno API не настроен"
      >
        <AlertCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground" />
        <span className="text-[10px] sm:text-xs text-muted-foreground font-medium">—</span>
      </div>
    );
  }

  const creditsLeft = balance.balance || 0;
  const isLow = creditsLeft <= 5;
  const isZero = creditsLeft === 0;

  return (
    <div 
      className={cn(
        "flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded transition-colors",
        isZero 
          ? "bg-destructive/10" 
          : isLow 
            ? "bg-warning/10" 
            : "bg-primary/10"
      )}
      title={`Suno баланс: ${creditsLeft} кредитов`}
    >
      <Coins className={cn(
        "h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0",
        isZero ? "text-destructive" : isLow ? "text-warning" : "text-primary"
      )} />
      <span className={cn(
        "text-[10px] sm:text-xs font-bold tabular-nums",
        isZero ? "text-destructive" : isLow ? "text-warning" : "text-primary"
      )}>
        {creditsLeft}
      </span>
    </div>
  );
};
