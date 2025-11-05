/**
 * Track Status Badge Component
 * Visual indicator for track generation status with animations
 * Implements P1-4 from 2025-11-05 audit
 * Phase 3: Added i18n localization support
 */

import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, FileEdit, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/i18n';

export type TrackStatus = 'pending' | 'draft' | 'processing' | 'completed' | 'failed';

interface StatusConfig {
  icon: typeof Clock;
  colorClass: string;
  pulse: boolean;
}

const STATUS_ICON_CONFIG: Record<TrackStatus, StatusConfig> = {
  pending: {
    icon: Clock,
    colorClass: 'bg-gray-100 text-gray-700 border-gray-200',
    pulse: false,
  },
  draft: {
    icon: FileEdit,
    colorClass: 'bg-blue-100 text-blue-700 border-blue-200',
    pulse: false,
  },
  processing: {
    icon: Loader2,
    colorClass: 'bg-amber-100 text-amber-700 border-amber-200',
    pulse: true,
  },
  completed: {
    icon: CheckCircle2,
    colorClass: 'bg-green-100 text-green-700 border-green-200',
    pulse: false,
  },
  failed: {
    icon: AlertCircle,
    colorClass: 'bg-red-100 text-red-700 border-red-200',
    pulse: false,
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
  const t = useTranslation();
  const config = STATUS_ICON_CONFIG[status];
  const Icon = config.icon;

  // Get localized label and description
  const label = t(`status.${status}` as const);
  const description = t(`statusDescription.${status}` as const);

  if (variant === 'icon-only') {
    return (
      <div
        className={cn(
          "inline-flex items-center justify-center w-6 h-6 rounded-full",
          config.colorClass,
          config.pulse && "animate-pulse",
          className
        )}
        title={showTooltip ? description : undefined}
        aria-label={`${t('status.pending')}: ${label}`}
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
        title={showTooltip ? description : undefined}
      >
        <div className="flex items-center gap-1">
          {showIcon && (
            <Icon className={cn(
              "w-2.5 h-2.5 sm:w-3 sm:h-3",
              config.pulse && "animate-spin"
            )} />
          )}
          <span>{label}</span>
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
      title={showTooltip ? description : undefined}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        {showIcon && (
          <Icon className={cn(
            "w-3.5 h-3.5 sm:w-4 sm:w-4",
            config.pulse && "animate-spin"
          )} />
        )}
        <span>{label}</span>
      </div>
    </Badge>
  );
});

TrackStatusBadge.displayName = 'TrackStatusBadge';

/**
 * Hook to get status configuration with localized labels
 * Useful for custom styling and status display
 */
export const useStatusConfig = (status: TrackStatus) => {
  const t = useTranslation();
  const config = STATUS_ICON_CONFIG[status];

  return {
    ...config,
    label: t(`status.${status}` as const),
    description: t(`statusDescription.${status}` as const),
  };
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
