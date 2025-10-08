/**
 * TrackVersionBadge Component
 * 
 * Отображает бадж с количеством версий трека
 * Показывается только если у трека есть дополнительные версии (>1)
 * 
 * Использование:
 * ```tsx
 * <TrackVersionBadge trackId={track.id} />
 * ```
 */

import { Badge } from "@/components/ui/badge";
import { useTrackVersionCount } from "@/hooks/useTrackVersions";
import { Layers } from "lucide-react";

interface TrackVersionBadgeProps {
  /** ID трека для проверки версий */
  trackId: string;
  
  /** Дополнительные CSS классы */
  className?: string;
  
  /** Размер бад жа */
  variant?: 'default' | 'secondary' | 'outline';
}

/**
 * Бадж с количеством версий трека
 * 
 * Автоматически загружает количество версий и отображает бадж
 * Если версий нет (только основной трек), бадж не отображается
 */
export function TrackVersionBadge({ 
  trackId, 
  className = '',
  variant = 'secondary'
}: TrackVersionBadgeProps) {
  // Загружаем количество версий через хук
  const versionCount = useTrackVersionCount(trackId);
  
  // Не показываем бадж если только одна версия (основной трек)
  if (versionCount <= 1) {
    return null;
  }
  
  return (
    <Badge 
      variant={variant}
      className={`flex items-center gap-1 ${className}`}
      title={`${versionCount} versions available`}
    >
      <Layers className="w-3 h-3" />
      <span>{versionCount}</span>
    </Badge>
  );
}

/**
 * Компактная версия бадж а (только иконка + число)
 * Используется в местах с ограниченным пространством
 */
export function TrackVersionBadgeCompact({ 
  trackId, 
  className = '' 
}: Pick<TrackVersionBadgeProps, 'trackId' | 'className'>) {
  const versionCount = useTrackVersionCount(trackId);
  
  if (versionCount <= 1) {
    return null;
  }
  
  return (
    <div 
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}
      title={`${versionCount} versions`}
    >
      <Layers className="w-3 h-3" />
      {versionCount}
    </div>
  );
}
