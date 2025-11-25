/**
 * Player visibility and expansion state
 * Интегрирован с глобальным UI состоянием для координации с FAB кнопкой
 */
import { useState, useEffect } from 'react';
import { useUIStateStore } from '@/stores/uiStateStore';
import { AudioPlayerTrack } from '@/stores/audioPlayerStore';

export const usePlayerVisibility = (currentTrack: AudioPlayerTrack | null | undefined) => {
  const [isVisible, setIsVisible] = useState(false);
  const setPlayerExpanded = useUIStateStore((state) => state.setPlayerExpanded);
  const isPlayerExpanded = useUIStateStore((state) => state.isPlayerExpanded);

  useEffect(() => {
    if (currentTrack) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
      setPlayerExpanded(false); // Сбрасываем состояние когда трек закрыт
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]); // Only depend on track ID to prevent infinite loops

  const setIsExpanded = (expanded: boolean) => {
    setPlayerExpanded(expanded);
  };

  return { isVisible, isExpanded: isPlayerExpanded, setIsExpanded };
};
