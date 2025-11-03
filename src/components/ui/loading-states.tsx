import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

/**
 * Универсальный индикатор загрузки с опциональным текстом
 */
interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
  className?: string;
}

export const Spinner = ({ size = 'md', text, className }: SpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
      {text && <span className="text-sm text-muted-foreground">{text}</span>}
    </div>
  );
};

/**
 * Полноэкранный индикатор загрузки
 */
interface FullPageSpinnerProps {
  text?: string;
}

export const FullPageSpinner = ({ text = 'Загрузка...' }: FullPageSpinnerProps) => {
  return (
    <div className="flex min-h-screen items-center justify-center" data-testid="full-page-spinner">
      <Spinner size="lg" text={text} />
    </div>
  );
};

/**
 * Centered spinner для контейнеров
 */
interface CenteredSpinnerProps {
  text?: string;
  className?: string;
}

export const CenteredSpinner = ({ text, className }: CenteredSpinnerProps) => {
  return (
    <div className={cn('flex items-center justify-center p-8', className)}>
      <Spinner size="md" text={text} />
    </div>
  );
};

/**
 * Skeleton loader для списка треков
 */
interface TrackListSkeletonProps {
  count?: number;
}

export const TrackListSkeleton = ({ count = 3 }: TrackListSkeletonProps) => {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-16 w-16 rounded-md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton loader для карточек треков (grid)
 */
interface TrackCardSkeletonProps {
  count?: number;
}

export const TrackCardSkeleton = ({ count = 6 }: TrackCardSkeletonProps) => {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-lg border p-4">
          <Skeleton className="aspect-square w-full rounded-md" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton loader для дашборда
 */
export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <TrackCardSkeleton count={6} />
      </div>
    </div>
  );
};

/**
 * Inline spinner для кнопок
 */
export const ButtonSpinner = () => {
  return <Loader2 className="h-4 w-4 animate-spin" />;
};

/**
 * Overlay spinner с затемнением фона
 */
interface OverlaySpinnerProps {
  text?: string;
}

export const OverlaySpinner = ({ text }: OverlaySpinnerProps) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="rounded-lg bg-card p-6 shadow-lg">
        <Spinner size="lg" text={text} />
      </div>
    </div>
  );
};
