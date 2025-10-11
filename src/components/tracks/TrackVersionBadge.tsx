/**
 * TrackVersionBadge Component
 * 
 * Отображает бадж с количеством версий трека
 * Показывается только если у трека есть дополнительные версии (>0)
 * 
 * Использование:
 * ```tsx
 * <TrackVersionBadge trackId={track.id} />
 * ```
 */

import { Badge } from "@/components/ui/badge";
import { useTrackVersionCount } from "@/features/tracks";
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
 * Автоматически загружает количество дополнительных версий и отображает бадж
 * Если дополнительных версий нет (только основной трек), бадж не отображается
 * Показывает количество ДОПОЛНИТЕЛЬНЫХ версий (без основной)
 */
export function TrackVersionBadge({ 
  trackId, 
  className = '',
  variant = 'secondary'
}: TrackVersionBadgeProps) {
  // Загружаем количество дополнительных версий через хук
  const versionCount = useTrackVersionCount(trackId);

  // Не показываем бадж если нет дополнительных версий
  if (versionCount === 0) {
    return null;
  }

  return (
    <Badge
      variant={variant}
      className={`flex items-center gap-1 ${className}`}
      title={`${versionCount} ${versionCount === 1 ? 'дополнительная версия' : 'дополнительных версий'}`}
    >
      <Layers className="w-3 h-3" />
      <span>+{versionCount}</span>
    </Badge>
  );
}

/**
 * Компактная версия бадж а (только иконка + число)
 * Используется в местах с ограниченным пространством
 * Показывает количество ДОПОЛНИТЕЛЬНЫХ версий (без основной)
 */
export function TrackVersionBadgeCompact({
  trackId,
  className = ''
}: Pick<TrackVersionBadgeProps, 'trackId' | 'className'>) {
  const versionCount = useTrackVersionCount(trackId);

  if (versionCount === 0) {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1 text-xs text-muted-foreground ${className}`}
      title={`${versionCount} дополнительных версий`}
    >
      <Layers className="w-3 h-3" />
      {versionCount}
    </div>
  );
}
