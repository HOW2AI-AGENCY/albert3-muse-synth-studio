/**
 * BalanceDisplay - Improved balance display component with comprehensive error handling
 * Addresses frequent error display issues with retry functionality and better UX
 */
import { memo, useCallback } from 'react';
import { Loader2, Coins, AlertCircle, RefreshCw } from '@/utils/iconImports';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { useProviderBalance } from '@/hooks/useProviderBalance';
import { cn } from '@/lib/utils';

export interface BalanceDisplayProps {
  /**
   * Display variant
   * @default 'compact'
   */
  variant?: 'compact' | 'full' | 'minimal';

  /**
   * Show retry button on error
   * @default true
   */
  showRetry?: boolean;

  /**
   * Size of the display
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Callback when balance is clicked
   */
  onClick?: () => void;
}

const SIZE_CONFIG = {
  sm: {
    badge: 'text-[10px] h-5 px-1.5',
    icon: 'h-3 w-3',
    text: 'text-[10px]',
    gap: 'gap-1',
  },
  md: {
    badge: 'text-xs h-6 px-2',
    icon: 'h-3.5 w-3.5',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
  lg: {
    badge: 'text-sm h-7 px-3',
    icon: 'h-4 w-4',
    text: 'text-sm',
    gap: 'gap-2',
  },
};

/**
 * BalanceDisplay component with improved error handling
 *
 * Features:
 * - Graceful error handling with retry
 * - Loading states
 * - Low balance warnings
 * - Multiple display variants
 * - Responsive design
 *
 * @component
 * @example
 * ```tsx
 * // Compact variant (default)
 * <BalanceDisplay />
 *
 * // Full variant with details
 * <BalanceDisplay variant="full" size="lg" />
 *
 * // Minimal variant
 * <BalanceDisplay variant="minimal" showRetry={false} />
 * ```
 */
export const BalanceDisplay = memo<BalanceDisplayProps>(
  ({
    variant = 'compact',
    showRetry = true,
    size = 'md',
    className,
    onClick,
  }) => {
    const { balance, isLoading, error, refetch } = useProviderBalance();

    const sizeConfig = SIZE_CONFIG[size];

    const handleRetry = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        refetch();
      },
      [refetch]
    );

    // Loading State
    if (isLoading) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="secondary"
                className={cn(
                  'inline-flex items-center font-medium cursor-wait',
                  sizeConfig.badge,
                  sizeConfig.gap,
                  className
                )}
              >
                <Loader2 className={cn(sizeConfig.icon, 'animate-spin')} />
                {variant !== 'minimal' && <span>Загрузка...</span>}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Загрузка баланса...</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Error State with Retry
    if (error) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={cn(
                  'inline-flex items-center',
                  sizeConfig.gap,
                  className
                )}
              >
                <Badge
                  variant="destructive"
                  className={cn(
                    'inline-flex items-center font-medium',
                    sizeConfig.badge,
                    sizeConfig.gap,
                    onClick && 'cursor-pointer',
                    !onClick && 'cursor-help'
                  )}
                  onClick={onClick}
                >
                  <AlertCircle className={sizeConfig.icon} />
                  {variant === 'full' && <span>Ошибка загрузки</span>}
                  {variant === 'compact' && <span>Ошибка</span>}
                </Badge>
                {showRetry && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn('flex-shrink-0', sizeConfig.icon)}
                    onClick={handleRetry}
                    title="Повторить загрузку"
                  >
                    <RefreshCw className={sizeConfig.icon} />
                  </Button>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p className="font-medium">Не удалось загрузить баланс</p>
                <p className="text-xs text-muted-foreground">
                  {error || 'Проверьте подключение к интернету'}
                </p>
                {showRetry && (
                  <p className="text-xs text-muted-foreground">
                    Нажмите на иконку обновления для повторной попытки
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    // Success State
    const balanceValue = balance?.balance ?? 0;
    const isLowBalance = balanceValue < 10;
    const isZeroBalance = balanceValue === 0;

    // Determine badge variant based on balance
    const getBadgeVariant = () => {
      if (isZeroBalance) return 'destructive';
      if (isLowBalance) return 'outline';
      return 'default';
    };

    // Format balance display
    const formatBalance = (value: number): string => {
      if (variant === 'minimal') {
        return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toFixed(0);
      }
      return value.toFixed(2);
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={getBadgeVariant()}
              className={cn(
                'inline-flex items-center font-medium transition-all duration-200',
                sizeConfig.badge,
                sizeConfig.gap,
                isLowBalance && !isZeroBalance && 'border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400',
                onClick && 'cursor-pointer hover:opacity-80',
                !onClick && 'cursor-help',
                className
              )}
              onClick={onClick}
            >
              <Coins className={sizeConfig.icon} />
              {variant !== 'minimal' && (
                <span className={sizeConfig.text}>
                  {formatBalance(balanceValue)}
                  {variant === 'full' && ' кредитов'}
                </span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-medium">
                Баланс: {balanceValue.toFixed(2)} кредитов
              </p>
              {isZeroBalance && (
                <p className="text-xs text-destructive">
                  Баланс исчерпан. Пополните счет для продолжения.
                </p>
              )}
              {isLowBalance && !isZeroBalance && (
                <p className="text-xs text-orange-400">
                  Низкий баланс. Рекомендуем пополнить.
                </p>
              )}
              {balance?.lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Обновлено: {new Date(balance.lastUpdated).toLocaleTimeString()}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
);

BalanceDisplay.displayName = 'BalanceDisplay';
