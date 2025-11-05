/**
 * Track Status Badge Component
 * Visual indicator for track generation status with animations
 * Implements P1-4 from 2025-11-05 audit
 */

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, FileEdit, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TrackStatus = 'pending' | 'draft' | 'processing' | 'completed' | 'failed';

interface StatusConfig {
  label: string;
  icon: typeof Clock;
  colorClass: string;
  pulse: boolean;
  description: string;
}

const STATUS_CONFIG: Record<TrackStatus, StatusConfig> = {
  pending: {
    label: 'Ожидание',
    icon: Clock,
    colorClass: 'bg-gray-100 text-gray-700 border-gray-200',
    pulse: false,
    description: 'Трек создан, ожидает добавления лирики или запуска генерации',
  },
  draft: {
    label: 'Черновик',
    icon: FileEdit,
    colorClass: 'bg-blue-100 text-blue-700 border-blue-200',
    pulse: false,
    description: 'Трек содержит лирику и готов к генерации',
  },
  processing: {
    label: 'Генерация',
    icon: Loader2,
    colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
    pulse: true,
    description: 'AI провайдер обрабатывает запрос на генерацию музыки',
  },
  completed: {
    label: 'Готов',
    icon: CheckCircle2,
    colorClass: 'bg-green-100 text-green-700 border-green-200',
    pulse: false,
    description: 'Генерация успешно завершена, трек готов к прослушиванию',
  },
  failed: {
    label: 'Ошибка',
    icon: AlertCircle,
    colorClass: 'bg-red-100 text-red-700 border-red-200',
    pulse: false,
    description: 'Произошла ошибка при генерации трека',
  },
};

interface TrackStatusBadgeProps {
  status: TrackStatus;
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
  showIcon?: boolean;
  showTooltip?: boolean;
}

export const TrackStatusBadge = memo<TrackStatusBadgeProps>(({
  status,
  variant = 'default',
  className,
  showIcon = true,
  showTooltip = true,
}) => {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  if (variant === 'icon-only') {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          config.colorClass,
          config.pulse && "animate-pulse",
          className
        )}
        title={showTooltip ? config.description : undefined}
        aria-label={`Статус: ${config.label}`}
      >
        <Icon className={cn(
          "w-3.5 h-3.5",
          config.pulse && "animate-spin"
        )} />
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <Badge
        variant="secondary"
        className={cn(
          "text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 font-medium border",
          config.colorClass,
          config.pulse && "animate-pulse",
          className
        )}
        title={showTooltip ? config.description : undefined}
      >
        <div className="flex items-center gap-1">
          {showIcon && (
            <Icon className={cn(
              "w-2.5 h-2.5 sm:w-3 sm:h-3",
              config.pulse && "animate-spin"
            )} />
          )}
          <span>{config.label}</span>
        </div>
      </Badge>
    );
  }

  // Default variant
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 font-medium border",
        config.colorClass,
        config.pulse && "animate-pulse",
        className
      )}
      title={showTooltip ? config.description : undefined}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        {showIcon && (
          <Icon className={cn(
            "w-3.5 h-3.5 sm:w-4 sm:w-4",
            config.pulse && "animate-spin"
          )} />
        )}
        <span>{config.label}</span>
      </div>
    </Badge>
  );
});

TrackStatusBadge.displayName = 'TrackStatusBadge';

/**
 * Hook to get status configuration
 * Useful for custom styling
 */
export const useStatusConfig = (status: TrackStatus): StatusConfig => {
  return STATUS_CONFIG[status];
};

/**
 * Utility to check if status allows generation
 * Based on can_generate_track() PostgreSQL function
 */
export const canGenerateTrack = (status: TrackStatus): boolean => {
  return status === 'pending' || status === 'draft';
};

/**
 * Utility to check if track is in final state
 */
export const isFinalStatus = (status: TrackStatus): boolean => {
  return status === 'completed' || status === 'failed';
};

/**
 * Utility to check if track is being processed
 */
export const isProcessingStatus = (status: TrackStatus): boolean => {
  return status === 'processing';
};
