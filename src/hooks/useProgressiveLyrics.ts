/**
 * Progressive/streaming lyrics loading hook
 * Shows lyrics line-by-line as they arrive from API with animations
 * 
 * @version 1.0.0
 * @created 2025-11-13
 */

import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';
import type { TimestampedWord } from '@/hooks/useTimestampedLyrics';

interface ProgressiveLyricsState {
  loadedWords: TimestampedWord[];
  progress: number; // 0-100
  isComplete: boolean;
}

export const useProgressiveLyrics = (
  allWords: TimestampedWord[] | undefined,
  enabled: boolean = true
) => {
  const [state, setState] = useState<ProgressiveLyricsState>({
    loadedWords: [],
    progress: 0,
    isComplete: false,
  });

  useEffect(() => {
    if (!enabled || !allWords || allWords.length === 0) {
      setState({
        loadedWords: [],
        progress: 0,
        isComplete: false,
      });
      return;
    }

    // Simulate progressive loading (in real implementation, this would stream from API)
    let currentIndex = 0;
    const totalWords = allWords.length;
    const wordsPerBatch = Math.max(5, Math.floor(totalWords / 20)); // Load 5% at a time

    const loadNextBatch = () => {
      if (currentIndex >= totalWords) {
        setState({
          loadedWords: allWords,
          progress: 100,
          isComplete: true,
        });
        logger.info('Progressive lyrics loading complete', 'useProgressiveLyrics', {
          totalWords,
        });
        return;
      }

      const nextIndex = Math.min(currentIndex + wordsPerBatch, totalWords);
      const batch = allWords.slice(0, nextIndex);
      const progress = Math.round((nextIndex / totalWords) * 100);

      setState({
        loadedWords: batch,
        progress,
        isComplete: false,
      });

      currentIndex = nextIndex;

      // Schedule next batch (simulating network delay)
      setTimeout(loadNextBatch, 100);
    };

    // Start loading
    loadNextBatch();

    return () => {
      // Cleanup
      currentIndex = totalWords;
    };
  }, [allWords, enabled]);

  const reset = useCallback(() => {
    setState({
      loadedWords: [],
      progress: 0,
      isComplete: false,
    });
  }, []);

  return {
    ...state,
    reset,
  };
};
