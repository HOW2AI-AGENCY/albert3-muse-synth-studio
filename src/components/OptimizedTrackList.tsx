import React, { useMemo, useCallback, memo } from 'react';
import { FixedSizeList as List } from 'react-window';


import { LazyLoadWrapper } from '../components/LazyLoadWrapper';
import { Track } from '../services/api.service';
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
  className?: string;
}

const ITEM_HEIGHT = 80; // Высота одного элемента списка
const COMPACT_ITEM_HEIGHT = 60; // Высота в компактном режиме
const VIRTUALIZATION_THRESHOLD = 50; // Порог для включения виртуализации

// Мемоизированный компонент элемента виртуализированного списка
const VirtualizedItemComponent = memo<{
  index: number;
  style: React.CSSProperties;
  data: {
    tracks: OptimizedTrack[];
    likedTracks: Set<string>;
    onLike: (trackId: string) => void;
    onDownload: (trackId: string) => void;
    onShare: (trackId: string) => void;
  };
}>(({ index, style, data }) => {
  const { tracks, likedTracks, onLike, onDownload, onShare } = data;
  const track = tracks[index];
  
  if (!track) return null;

  return (
    <div style={style}>
      <TrackListItem
        track={{ ...track, status: track.status ?? 'ready' }}
        isLiked={likedTracks.has(track.id)}
        onLike={onLike}
        onDownload={onDownload}
        onShare={onShare}
      />
    </div>
  );
});

VirtualizedItemComponent.displayName = 'VirtualizedItemComponent';

export const OptimizedTrackList: React.FC<OptimizedTrackListProps> = memo(({
  tracks,
  onLike,
  onDownload,
  onShare,
  likedTracks = new Set(),
  height = 400,
  itemHeight = ITEM_HEIGHT,
  enableVirtualization = true,
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

  // Мемоизируем данные для виртуализированного списка
  const itemData = useMemo(() => ({
    tracks,
    likedTracks,
    onLike: handleLike,
    onDownload: handleDownload,
    onShare: handleShare,
  }), [tracks, likedTracks, handleLike, handleDownload, handleShare]);

  // Обычный рендер без виртуализации
  const regularRender = useMemo(() => (
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

  // Определяем, нужна ли виртуализация
  const shouldVirtualize = enableVirtualization && tracks.length > VIRTUALIZATION_THRESHOLD;

  // Используем виртуализацию для больших списков
  if (shouldVirtualize) {
    return (
      <div className={className}>
        <List
          height={height}
          itemCount={tracks.length}
          itemSize={itemHeight}
          itemData={itemData}
          width="100%"
        >
          {VirtualizedItemComponent as any}
        </List>
          
      </div>
    );
  }

  return regularRender;
});

OptimizedTrackList.displayName = 'OptimizedTrackList';

export default OptimizedTrackList;