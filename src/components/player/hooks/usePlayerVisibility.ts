/**
 * Player visibility and expansion state
 * Интегрирован с глобальным UI состоянием для координации с FAB кнопкой
 */
import { useState, useEffect, useRef } from 'react';
import { useUIStateStore } from '@/stores/uiStateStore';
import { AudioPlayerTrack } from '@/stores/audioPlayerStore';

export const usePlayerVisibility = (currentTrack: AudioPlayerTrack | null | undefined) => {
  const [isVisible, setIsVisible] = useState(false);
  const setPlayerExpanded = useUIStateStore((state) => state.setPlayerExpanded);
  const isPlayerExpanded = useUIStateStore((state) => state.isPlayerExpanded);

  // ✅ FIX [React error #185]: Отслеживание mounted состояния
  // WHY: setPlayerExpanded обновляет глобальный store, может быть вызван после unmount
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (currentTrack) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
      // ✅ FIX [React error #185]: Проверка mounted перед обновлением глобального store
      if (isMountedRef.current) {
        setPlayerExpanded(false);
      }
    }

    // ✅ FIX [React error #185]: Cleanup для установки unmounted флага
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.id]); // Only depend on track ID to prevent infinite loops

  const setIsExpanded = (expanded: boolean) => {
    // ✅ FIX [React error #185]: Проверка mounted перед обновлением store
    // WHY: setIsExpanded может быть вызван из event handlers после unmount
    if (isMountedRef.current) {
      setPlayerExpanded(expanded);
    }
  };

  return { isVisible, isExpanded: isPlayerExpanded, setIsExpanded };
};
