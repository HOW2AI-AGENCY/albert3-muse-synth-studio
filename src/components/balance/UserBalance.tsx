// src/components/balance/UserBalance.tsx

import { useProviderBalance } from '@/hooks/useProviderBalance';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Zap } from 'lucide-react';

/**
 * UserBalance Component
 *
 * Displays the user's current Suno credit balance.
 * It handles loading and error states gracefully.
 *
 * @returns {JSX.Element} The rendered balance component.
 */
export const UserBalance = () => {
  // Используем существующий хук для получения баланса
  const { balance, isLoading, error } = useProviderBalance();

  // Обработка состояния загрузки
  if (isLoading) {
    return <Skeleton className="h-8 w-24 rounded-md" />;
  }

  // Обработка состояния ошибки
  if (error) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <div className="flex items-center text-red-500">
            <Zap className="h-4 w-4 mr-2" />
            <span>Ошибка</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Не удалось загрузить баланс: {error}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Основное отображение баланса
  return (
    <Tooltip>
      <TooltipTrigger>
        <div className="flex items-center text-sm font-medium text-foreground bg-secondary px-3 py-1.5 rounded-md border border-border/50">
          <Zap className="h-4 w-4 mr-2 text-yellow-500" />
          <span>{balance?.balance ?? 0}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>Оставшиеся кредиты для генерации</p>
      </TooltipContent>
    </Tooltip>
  );
};
