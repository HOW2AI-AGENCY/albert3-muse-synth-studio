import { useBalance } from '@/hooks/useBalance';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Coins } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * @description
 * Компонент для отображения баланса кредитов Suno.
 * Обрабатывает состояния загрузки и ошибки.
 */
export const UserBalance = ({ className }: { className?: string }) => {
  const { data: balanceInfo, isLoading, isError, error } = useBalance();

  const renderContent = () => {
    if (isLoading) {
      return <Skeleton className="h-6 w-24" />;
    }

    if (isError) {
      return (
        <TooltipProvider>
          <Tooltip delayDuration={100}>
            <TooltipTrigger>
              <div className="flex items-center text-red-500">
                <AlertCircle className="mr-2 h-5 w-5" />
                <span>Ошибка</span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Не удалось загрузить баланс.</p>
              <p className="text-xs text-muted-foreground">{error?.message}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    if (!balanceInfo) {
      return null; // Или какой-то запасной UI
    }

    // Используем Intl.NumberFormat для корректного форматирования для русской локали
    const formattedCredits = new Intl.NumberFormat('ru-RU').format(Math.floor(balanceInfo.credits_left));

    return (
      <div className="flex items-center">
        <Coins className="mr-2 h-5 w-5 text-yellow-500" />
        <span className="font-semibold">
          {formattedCredits}
        </span>
        <span className="ml-1 text-sm text-muted-foreground">кредитов</span>
      </div>
    );
  };

  return (
    <div
      className={cn(
        'flex h-10 items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm',
        className
      )}
    >
      {renderContent()}
    </div>
  );
};
