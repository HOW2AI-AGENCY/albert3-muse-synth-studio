// START: AI-generated code
// JULES: Импортируем типы для обработчиков, чтобы сделать компонент интерактивным
import React, { useMemo, useCallback, memo } from 'react';
import { TrackListItem, TrackListItemProps } from '@/design-system/components/compositions/TrackListItem/TrackListItem';
import { OptimizedTrack } from '../types/track';

// JULES: Расширяем интерфейс, чтобы он мог принимать обработчики действий
interface OptimizedTrackListProps {
  tracks: OptimizedTrack[];
  className?: string;
  // JULES: Добавляем onPlay для кнопки воспроизведения
  onPlay?: (trackId: string) => void;
  // JULES: Добавляем isPlaying, чтобы знать, какой трек сейчас играет
  playingTrackId?: string | null;
  // JULES: Добавляем actionMenuProps для выпадающего меню
  actionMenuProps?: TrackListItemProps['actionMenuProps'];
}

export const OptimizedTrackList: React.FC<OptimizedTrackListProps> = memo(({
  tracks,
  className = '',
  onPlay,
  playingTrackId,
  actionMenuProps,
}) => {
  // ... (normalizeStatus остается без изменений)
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
          // JULES: Передаем полученные обработчики и состояние в дочерний компонент
          isPlaying={playingTrackId === track.id}
          onPlay={() => onPlay?.(track.id)}
          actionMenuProps={actionMenuProps}
        />
      ))}
    </div>
  ), [tracks, className, normalizeStatus, onPlay, playingTrackId, actionMenuProps]);
});

OptimizedTrackList.displayName = 'OptimizedTrackList';

export default OptimizedTrackList;
// END: AI-generated code