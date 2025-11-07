/**
 * Player visibility and expansion state
 * Интегрирован с глобальным UI состоянием для координации с FAB кнопкой
 */
import { useState, useEffect } from 'react';
import { useUIStateStore } from '@/stores/uiStateStore';

export const usePlayerVisibility = (currentTrack: any) => {
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
    // ✅ FIX: Remove setPlayerExpanded from deps - Zustand store functions are stable
  }, [currentTrack]);

  const setIsExpanded = (expanded: boolean) => {
    setPlayerExpanded(expanded);
  };

  return { isVisible, isExpanded: isPlayerExpanded, setIsExpanded };
};
