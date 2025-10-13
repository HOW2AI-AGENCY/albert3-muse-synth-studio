import { useMurekaBalance } from '@/hooks/useMurekaBalance';
import { DollarSign, Loader2 } from '@/utils/iconImports';

export const MurekaBalanceDisplay = () => {
  const { data, isLoading, error } = useMurekaBalance();

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50">
        <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />
        <span className="text-xs text-muted-foreground">Загрузка...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div 
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary/50 border border-border" 
        title="Mureka API ключ не настроен"
      >
        <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Не настроен</span>
      </div>
    );
  }

  return (
    <div 
      className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20" 
      title={`Mureka баланс: ${data.balance} ${data.currency}`}
    >
      <DollarSign className="h-3.5 w-3.5 text-primary" />
      <span className="text-xs font-bold text-gradient-primary">
        {data.balance.toFixed(2)} {data.currency}
      </span>
    </div>
  );
};
