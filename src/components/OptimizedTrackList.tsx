import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { TrackListItem } from './tracks/TrackListItem';
import { OptimizedTrack, convertToOptimizedTrack } from '../types/track';

interface OptimizedTrackListProps {
  tracks: OptimizedTrack[];
  onLike?: (trackId: string) => void;
  onDownload?: (trackId: string) => void;
  onShare?: (trackId: string) => void;
  likedTracks?: Set<string>;
  height?: number;
  itemHeight?: number;
  enableVirtualization?: boolean;
}

const ITEM_HEIGHT = 80; // Высота одного элемента списка
const COMPACT_ITEM_HEIGHT = 60; // Высота в компактном режиме

export const OptimizedTrackList: React.FC<OptimizedTrackListProps> = ({
  tracks,
  onLike,
  onDownload,
  onShare,
  likedTracks = new Set(),
  height = 400,
  itemHeight = 80,
  enableVirtualization = true,
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

  // Мемоизируем элемент списка для виртуализации
  const VirtualizedItem = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const track = tracks[index];
    if (!track) return null;

    return (
      <div style={style}>
        <TrackListItem
          track={{ ...track, status: track.status ?? 'ready' }}
          isLiked={likedTracks.has(track.id)}
          onLike={handleLike}
          onDownload={handleDownload}
          onShare={handleShare}
        />
      </div>
    );
  }, [tracks, likedTracks, handleLike, handleDownload, handleShare]);

  // Обычный рендер без виртуализации
  const regularRender = useMemo(() => (
    <div className="space-y-2">
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
  ), [tracks, likedTracks, handleLike, handleDownload, handleShare]);

  // Используем виртуализацию для больших списков
  if (enableVirtualization && tracks.length > 50) {
    return (
      <List
        height={height}
        itemCount={tracks.length}
        itemSize={itemHeight}
        itemData={tracks}
        width="100%"
      >
        {VirtualizedItem}
      </List>
    );
  }

  return regularRender;


});

OptimizedTrackList.displayName = 'OptimizedTrackList';