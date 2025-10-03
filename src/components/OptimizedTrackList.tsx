import React, { useMemo, useCallback, memo } from 'react';
import { TrackListItem } from './tracks/TrackListItem';
import { OptimizedTrack } from '../types/track';

interface OptimizedTrackListProps {
  tracks: OptimizedTrack[];
  onLike?: (trackId: string) => void;
  onDownload?: (trackId: string) => void;
  onShare?: (trackId: string) => void;
  likedTracks?: Set<string>;
  className?: string;
}


export const OptimizedTrackList: React.FC<OptimizedTrackListProps> = memo(({
  tracks,
  onLike,
  onDownload,
  onShare,
  likedTracks = new Set(),
  className = '',
}) => {
  // Мемоизируем обработчики для предотвращения лишних ререндеров
  const handleLike = useCallback((trackId: string) => {
    onLike?.(trackId);
  }, [onLike]);

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
          isLiked={likedTracks.has(track.id)}
          onLike={handleLike}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      ))}
    </div>
  ), [tracks, likedTracks, handleLike, handleDownload, handleShare, className]);
});

OptimizedTrackList.displayName = 'OptimizedTrackList';

export default OptimizedTrackList;