import React, { useMemo, useCallback, memo } from 'react';
import { TrackListItem } from '@/features/tracks';
import { OptimizedTrack } from '../types/track';

interface OptimizedTrackListProps {
  tracks: OptimizedTrack[];
  onDownload?: (trackId: string) => void;
  onShare?: (trackId: string) => void;
  className?: string;
}


export const OptimizedTrackList: React.FC<OptimizedTrackListProps> = memo(({
  tracks,
  onDownload,
  onShare,
  className = '',
}) => {
  // Нормализуем статус трека: draft/undefined считаем как pending
  const normalizeStatus = useCallback((status?: OptimizedTrack['status']): OptimizedTrack['status'] => {
    if (!status || status === 'draft' || status === 'pending') return 'pending';
    if (status === 'processing') return 'processing';
    if (status === 'failed') return 'failed';
    return 'completed';
  }, []);
  // Мемоизируем обработчики для предотвращения лишних ререндеров
  const handleDownload = useCallback((trackId: string) => {
    onDownload?.(trackId);
  }, [onDownload]);

  const handleShare = useCallback((trackId: string) => {
    onShare?.(trackId);
  }, [onShare]);

  // Обычный рендер с оптимизацией
  return useMemo(() => (
    <div className={`space-y-2 ${className}`}>
      {tracks.map((track) => (
        <TrackListItem
          key={track.id}
          track={{ ...track, status: normalizeStatus(track.status) as 'pending' | 'processing' | 'completed' | 'failed' }}
          onDownload={() => handleDownload(track.id)}
          onShare={() => handleShare(track.id)}
        />
      ))}
    </div>
  ), [tracks, handleDownload, handleShare, className, normalizeStatus]);
});

OptimizedTrackList.displayName = 'OptimizedTrackList';

export default OptimizedTrackList;