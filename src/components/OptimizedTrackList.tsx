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
  // Нормализуем статус трека: undefined считаем как pending
  const normalizeStatus = useCallback((status?: OptimizedTrack['status']): OptimizedTrack['status'] => {
    if (!status || status === 'pending') return 'pending';
    if (status === 'processing') return 'processing';
    if (status === 'failed') return 'failed';
    return 'completed';
  }, []);

  return useMemo(() => (
    <div className={`space-y-2 ${className}`}>
      {tracks.map((track) => (
        <TrackListItem
          key={track.id}
          track={{
            ...track,
            status: normalizeStatus(track.status) as 'pending' | 'processing' | 'completed' | 'failed',
          } as any}
        />
      ))}
    </div>
  ), [tracks, className, normalizeStatus]);
});

OptimizedTrackList.displayName = 'OptimizedTrackList';

export default OptimizedTrackList;