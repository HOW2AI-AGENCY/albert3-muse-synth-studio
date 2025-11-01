/**
 * Player visibility and expansion state
 */
import { useState, useEffect } from 'react';

export const usePlayerVisibility = (currentTrack: any) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (currentTrack) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [currentTrack]);

  return { isVisible, isExpanded, setIsExpanded };
};
