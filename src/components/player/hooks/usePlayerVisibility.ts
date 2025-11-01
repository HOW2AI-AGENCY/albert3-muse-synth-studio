/**
 * Player visibility animation logic
 */
import { useState, useEffect } from 'react';

export const usePlayerVisibility = (currentTrack: any) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (currentTrack) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [currentTrack]);

  return { isVisible };
};
