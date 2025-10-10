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
          track={{ ...track, status: track.status ?? 'ready' }}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      ))}
    </div>
  ), [tracks, handleDownload, handleShare, className]);
});

OptimizedTrackList.displayName = 'OptimizedTrackList';

export default OptimizedTrackList;