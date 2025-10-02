import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Track } from '@/types/database';
import { TrackCard } from './TrackCard';

interface VirtualizedListProps {
  tracks: Track[];
  height: number;
  itemHeight?: number;
  className?: string;
  onTrackSelect?: (track: Track) => void;
}

interface ItemData {
  tracks: Track[];
  onTrackSelect?: (track: Track) => void;
}

// Мемоизированный компонент элемента списка
const ListItem = React.memo<{
  index: number;
  style: React.CSSProperties;
  data: ItemData;
}>(({ index, style, data }) => {
  const track = data.tracks[index];
  
  if (!track) return null;

  return (
    <div style={style} className="px-2 py-1">
      <TrackCard 
        track={track} 
        onClick={() => data.onTrackSelect?.(track)}
      />
    </div>
  );
});

ListItem.displayName = 'VirtualizedListItem';

/**
 * Виртуализированный список для оптимизации производительности
 * при отображении больших списков треков
 */
export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  tracks,
  height,
  itemHeight = 200,
  className,
  onTrackSelect
}) => {
  // Мемоизируем данные для передачи в элементы списка
  const itemData = useMemo<ItemData>(() => ({
    tracks,
    onTrackSelect
  }), [tracks, onTrackSelect]);

  // Мемоизируем обработчик для оптимизации
  const handleTrackSelect = useCallback((track: Track) => {
    onTrackSelect?.(track);
  }, [onTrackSelect]);

  // Если треков мало, используем обычный рендеринг
  if (tracks.length <= 10) {
    return (
      <div className={className}>
        {tracks.map((track) => (
          <div key={track.id} className="px-2 py-1">
            <TrackCard 
              track={track} 
              onClick={() => handleTrackSelect(track)}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={className}>
      <List
        height={height}
        itemCount={tracks.length}
        itemSize={itemHeight}
        itemData={itemData}
        overscanCount={5} // Предварительно рендерим 5 элементов для плавной прокрутки
      >
        {ListItem}
      </List>
    </div>
  );
};

export default VirtualizedList;