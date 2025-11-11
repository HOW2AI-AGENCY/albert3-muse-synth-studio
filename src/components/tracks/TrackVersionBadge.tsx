/**
 * TrackVersionBadge - Компактный индикатор версии трека
 * Показывает текущую версию с анимацией загрузки
 */
import { memo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrackVersionBadgeProps {
  versionNumber: number;
  isMasterVersion?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const TrackVersionBadge = memo(({ 
  versionNumber, 
  isMasterVersion, 
  isLoading,
  className 
}: TrackVersionBadgeProps) => {
  return (
    <Badge
      variant={isMasterVersion ? 'default' : 'secondary'}
      className={cn(
        'text-[10px] px-1.5 py-0 h-4 font-medium transition-all duration-200',
        isMasterVersion && 'bg-gradient-to-r from-blue-500 to-blue-600',
        isLoading && 'animate-pulse',
        className
      )}
    >
      {isLoading ? (
        <Loader2 className="h-2.5 w-2.5 animate-spin" />
      ) : (
        <>V{versionNumber}</>
      )}
    </Badge>
  );
});

TrackVersionBadge.displayName = 'TrackVersionBadge';
