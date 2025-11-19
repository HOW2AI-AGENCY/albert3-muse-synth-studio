/**
 * TrackBadge - Unified badge component for track metadata visualization
 * Displays various track characteristics: type, features, status
 */
import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Music, Mic2, GitBranch, Split } from '@/utils/iconImports';
import { cn } from '@/lib/utils';

export type TrackBadgeType =
  | 'instrumental'
  | 'vocals'
  | 'stems'
  | 'version';

export interface TrackBadgeProps {
  /**
   * Type of badge to display
   */
  type: TrackBadgeType;

  /**
   * Optional label text (overrides default for type)
   */
  label?: string;

  /**
   * Version number (only used when type='version')
   */
  versionNumber?: number;

  /**
   * Show icon alongside text
   * @default true
   */
  showIcon?: boolean;

  /**
   * Variant style
   * @default 'secondary'
   */
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';

  /**
   * Size of badge
   * @default 'sm'
   */
  size?: 'xs' | 'sm' | 'md';

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Tooltip text (for accessibility)
   */
  tooltip?: string;
}

const BADGE_CONFIG = {
  instrumental: {
    icon: Music,
    label: 'Instrumental',
    variant: 'secondary' as const,
    colors: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  },
  vocals: {
    icon: Mic2,
    label: 'Vocals',
    variant: 'secondary' as const,
    colors: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  },
  stems: {
    icon: Split,
    label: 'Stems',
    variant: 'secondary' as const,
    colors: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  },
  version: {
    icon: GitBranch,
    label: 'V1',
    variant: 'outline' as const,
    colors: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  },
};

const SIZE_CLASSES = {
  xs: 'text-[9px] h-4 px-1 gap-0.5',
  sm: 'text-[10px] h-5 px-1.5 gap-1',
  md: 'text-xs h-6 px-2 gap-1.5',
};

const ICON_SIZE_CLASSES = {
  xs: 'h-2.5 w-2.5',
  sm: 'h-3 w-3',
  md: 'h-3.5 w-3.5',
};

/**
 * TrackBadge component for displaying track metadata
 *
 * @component
 * @example
 * ```tsx
 * // Instrumental track badge
 * <TrackBadge type="instrumental" />
 *
 * // Track with vocals
 * <TrackBadge type="vocals" />
 *
 * // Track with stems
 * <TrackBadge type="stems" />
 *
 * // Version badge
 * <TrackBadge type="version" versionNumber={2} />
 *
 * // Custom label
 * <TrackBadge type="vocals" label="Lead Vocals" />
 * ```
 */
export const TrackBadge = memo<TrackBadgeProps>(
  ({
    type,
    label,
    versionNumber = 1,
    showIcon = true,
    variant,
    size = 'sm',
    className,
    tooltip,
  }) => {
    const config = BADGE_CONFIG[type];
    const Icon = config.icon;

    // Determine display label
    const displayLabel =
      label || (type === 'version' ? `V${versionNumber}` : config.label);

    // Determine variant (use prop or config default)
    const effectiveVariant = variant || config.variant;

    return (
      <Badge
        variant={effectiveVariant}
        className={cn(
          'font-medium inline-flex items-center transition-all duration-150',
          SIZE_CLASSES[size],
          effectiveVariant === 'outline' && config.colors,
          effectiveVariant === 'secondary' && config.colors,
          className
        )}
        title={tooltip || displayLabel}
      >
        {showIcon && <Icon className={ICON_SIZE_CLASSES[size]} aria-hidden="true" />}
        <span>{displayLabel}</span>
      </Badge>
    );
  }
);

TrackBadge.displayName = 'TrackBadge';

/**
 * TrackBadgeGroup - Container for displaying multiple badges together
 */
interface TrackBadgeGroupProps {
  children: React.ReactNode;
  className?: string;
}

export const TrackBadgeGroup = memo<TrackBadgeGroupProps>(({ children, className }) => {
  return (
    <div className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {children}
    </div>
  );
});

TrackBadgeGroup.displayName = 'TrackBadgeGroup';
