import React, { useCallback, useMemo } from 'react';
import { Track } from '@/services/api.service';
import { TrackCard } from '@/features/tracks/components/TrackCard';

interface VirtualizedTracksListProps {
  tracks: Track[];
  containerWidth: number;
  containerHeight: number;
  onShare?: (trackId: string) => void;
  onSelect?: (track: Track) => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
}

const CARD_WIDTH = 200;
const GAP = 12;

/**
 * Виртуализированный список треков
 * Использует CSS Grid с оптимизированным рендерингом
 * Оптимизирует производительность при отображении большого количества треков
 */
export const VirtualizedTracksList: React.FC<VirtualizedTracksListProps> = ({
  tracks,
  containerWidth,
  onShare,
  onSelect,
  onRetry,
  onDelete,
  onSeparateStems,
  onExtend,
  onCover,
}) => {
  // Вычисляем количество колонок на основе ширины контейнера
  const columnCount = useMemo(() => {
    return Math.max(1, Math.floor(containerWidth / (CARD_WIDTH + GAP)));
  }, [containerWidth]);

  // Мемоизированные обработчики
  const handleSelect = useCallback((track: Track) => {
    onSelect?.(track);
  }, [onSelect]);

  const handleShare = useCallback((trackId: string) => {
    onShare?.(trackId);
  }, [onShare]);

  const handleSeparateStems = useCallback((trackId: string) => {
    onSeparateStems?.(trackId);
  }, [onSeparateStems]);

  const handleExtend = useCallback((trackId: string) => {
    onExtend?.(trackId);
  }, [onExtend]);

  const handleCover = useCallback((trackId: string) => {
    onCover?.(trackId);
  }, [onCover]);

  if (tracks.length === 0) {
    return null;
  }

  return (
    <div 
      className="grid gap-3 auto-rows-max"
      style={{
        gridTemplateColumns: `repeat(${columnCount}, ${CARD_WIDTH}px)`,
      }}
    >
      {tracks.map((track) => (
        <TrackCard
          key={track.id}
          track={track as any}
          onClick={onSelect ? () => handleSelect(track) : undefined}
          onShare={onShare ? () => handleShare(track.id) : undefined}
          onRetry={onRetry}
          onDelete={onDelete}
          onSeparateStems={onSeparateStems ? () => handleSeparateStems(track.id) : undefined}
          onExtend={onExtend ? () => handleExtend(track.id) : undefined}
          onCover={onCover ? () => handleCover(track.id) : undefined}
        />
      ))}
    </div>
  );
};

VirtualizedTracksList.displayName = 'VirtualizedTracksList';
