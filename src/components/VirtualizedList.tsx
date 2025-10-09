import React, { useCallback } from 'react';
import { Track } from '@/services/api.service';
import { TrackCard } from '@/features/tracks';
import { normalizeTrack } from '@/utils/trackNormalizer';

interface VirtualizedListProps {
  tracks: Track[];
  height: number;
  itemHeight?: number;
  className?: string;
  onTrackSelect?: (track: Track) => void;
}

/**
 * Виртуализированный список для оптимизации производительности
 * при отображении больших списков треков
 */
export const VirtualizedList: React.FC<VirtualizedListProps> = ({
  tracks,
  height,
  
  className,
  onTrackSelect
}) => {
  // Мемоизируем обработчик для оптимизации
  const handleTrackSelect = useCallback((track: Track) => {
    onTrackSelect?.(track);
  }, [onTrackSelect]);

  // Простой рендеринг списка без виртуализации
  return (
    <div className={className} style={{ height, overflowY: 'auto' }}>
      {tracks.map((track) => (
        <div key={track.id} className="px-2 py-1">
          <TrackCard 
            track={normalizeTrack(track)}
            onClick={() => handleTrackSelect(track)}
          />
        </div>
      ))}
    </div>
  );
};

export default VirtualizedList;