/**
 * TrackMetrics - Component for displaying track metrics and statistics
 * Shows duration, likes, views, and play counts with proper formatting
 */
import { memo } from 'react';
import { Clock, Heart, Eye, Play } from '@/utils/iconImports';
import { cn } from '@/lib/utils';

export interface TrackMetricsProps {
  /**
   * Track duration in seconds
   */
  duration?: number | null;

  /**
   * Number of likes/favorites
   */
  likes?: number | null;

  /**
   * Number of views
   */
  views?: number | null;

  /**
   * Number of plays
   */
  plays?: number | null;

  /**
   * Layout orientation
   * @default 'horizontal'
   */
  layout?: 'horizontal' | 'vertical' | 'compact';

  /**
   * Size of metrics
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';

  /**
   * Show labels alongside metrics
   * @default false
   */
  showLabels?: boolean;

  /**
   * Which metrics to display (if not provided, shows all available metrics)
   */
  display?: ('duration' | 'likes' | 'views' | 'plays')[];

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Format duration from seconds to MM:SS or HH:MM:SS
 */
const formatDuration = (seconds: number): string => {
  if (!seconds || seconds < 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Format large numbers with K/M suffix
 */
const formatCount = (count: number): string => {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

const SIZE_CLASSES = {
  sm: {
    text: 'text-[10px]',
    icon: 'h-3 w-3',
    gap: 'gap-0.5',
  },
  md: {
    text: 'text-xs',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-1',
  },
  lg: {
    text: 'text-sm',
    icon: 'h-4 w-4',
    gap: 'gap-1.5',
  },
};

const LAYOUT_CLASSES = {
  horizontal: 'flex-row items-center',
  vertical: 'flex-col items-start',
  compact: 'flex-row items-center flex-wrap',
};

interface MetricItemProps {
  icon: typeof Clock;
  value: string;
  label?: string;
  size: 'sm' | 'md' | 'lg';
  showLabel: boolean;
  className?: string;
}

const MetricItem = memo<MetricItemProps>(
  ({ icon: Icon, value, label, size, showLabel, className }) => {
    const sizeConfig = SIZE_CLASSES[size];

    return (
      <div
        className={cn(
          'inline-flex items-center',
          sizeConfig.gap,
          'text-muted-foreground transition-colors',
          className
        )}
        title={showLabel ? undefined : label}
      >
        <Icon className={cn(sizeConfig.icon, 'flex-shrink-0')} aria-hidden="true" />
        <span className={cn(sizeConfig.text, 'font-medium tabular-nums')}>{value}</span>
        {showLabel && label && (
          <span className={cn(sizeConfig.text, 'font-normal')}>{label}</span>
        )}
      </div>
    );
  }
);

MetricItem.displayName = 'MetricItem';

/**
 * TrackMetrics component for displaying track statistics
 *
 * @component
 * @example
 * ```tsx
 * // Basic usage with all metrics
 * <TrackMetrics
 *   duration={180}
 *   likes={1250}
 *   views={5600}
 *   plays={3400}
 * />
 *
 * // Compact layout with selected metrics
 * <TrackMetrics
 *   duration={180}
 *   likes={1250}
 *   layout="compact"
 *   display={['duration', 'likes']}
 * />
 *
 * // Vertical layout with labels
 * <TrackMetrics
 *   duration={180}
 *   likes={1250}
 *   views={5600}
 *   layout="vertical"
 *   showLabels
 * />
 * ```
 */
export const TrackMetrics = memo<TrackMetricsProps>(
  ({
    duration,
    likes,
    views,
    plays,
    layout = 'horizontal',
    size = 'md',
    showLabels = false,
    display,
    className,
  }) => {
    // Build metrics array based on what's available and what's requested
    const metrics = [];

    const shouldShow = (metric: string) =>
      !display || display.includes(metric as any);

    if (duration != null && shouldShow('duration')) {
      metrics.push({
        key: 'duration',
        icon: Clock,
        value: formatDuration(duration),
        label: 'Длительность',
      });
    }

    if (likes != null && shouldShow('likes')) {
      metrics.push({
        key: 'likes',
        icon: Heart,
        value: formatCount(likes),
        label: 'Лайков',
      });
    }

    if (views != null && shouldShow('views')) {
      metrics.push({
        key: 'views',
        icon: Eye,
        value: formatCount(views),
        label: 'Просмотров',
      });
    }

    if (plays != null && shouldShow('plays')) {
      metrics.push({
        key: 'plays',
        icon: Play,
        value: formatCount(plays),
        label: 'Прослушиваний',
      });
    }

    if (metrics.length === 0) {
      return null;
    }

    return (
      <div
        className={cn(
          'inline-flex',
          LAYOUT_CLASSES[layout],
          layout === 'horizontal' && 'gap-3',
          layout === 'vertical' && 'gap-1.5',
          layout === 'compact' && 'gap-2',
          className
        )}
      >
        {metrics.map((metric, index) => (
          <MetricItem
            key={metric.key}
            icon={metric.icon}
            value={metric.value}
            label={metric.label}
            size={size}
            showLabel={showLabels}
            className={
              layout === 'horizontal' && index !== 0
                ? 'before:content-["•"] before:mr-3 before:text-muted-foreground/50'
                : undefined
            }
          />
        ))}
      </div>
    );
  }
);

TrackMetrics.displayName = 'TrackMetrics';

// Export utility functions for use in other components
export { formatDuration, formatCount };
