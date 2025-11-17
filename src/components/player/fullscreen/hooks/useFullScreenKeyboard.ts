/**
 * Full Screen Player Keyboard Shortcuts Hook
 * Handles keyboard shortcuts for desktop player
 */

import { useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

interface UseFullScreenKeyboardProps {
  togglePlayPause: () => void;
  seekForward: (seconds: number) => void;
  seekBackward: (seconds: number) => void;
  toggleLyrics?: () => void;
  increaseFontSize?: () => void;
  decreaseFontSize?: () => void;
  exitFullScreen: () => void;
  increaseVolume?: () => void;
  decreaseVolume?: () => void;
  toggleMute?: () => void;
}

export const useFullScreenKeyboard = ({
  togglePlayPause,
  seekForward,
  seekBackward,
  toggleLyrics,
  increaseFontSize,
  decreaseFontSize,
  exitFullScreen,
  increaseVolume,
  decreaseVolume,
  toggleMute,
}: UseFullScreenKeyboardProps) => {
  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case ' ':
      case 'k':
        e.preventDefault();
        togglePlayPause();
        logger.debug('Keyboard: Play/Pause', 'FullScreenPlayer');
        break;

      case 'ArrowRight':
        e.preventDefault();
        seekForward(10);
        logger.debug('Keyboard: Seek forward 10s', 'FullScreenPlayer');
        break;

      case 'ArrowLeft':
        e.preventDefault();
        seekBackward(10);
        logger.debug('Keyboard: Seek backward 10s', 'FullScreenPlayer');
        break;

      case 'ArrowUp':
        e.preventDefault();
        increaseVolume?.();
        logger.debug('Keyboard: Volume up', 'FullScreenPlayer');
        break;

      case 'ArrowDown':
        e.preventDefault();
        decreaseVolume?.();
        logger.debug('Keyboard: Volume down', 'FullScreenPlayer');
        break;

      case 'l':
        e.preventDefault();
        toggleLyrics?.();
        logger.debug('Keyboard: Toggle lyrics', 'FullScreenPlayer');
        break;

      case '+':
      case '=':
        e.preventDefault();
        increaseFontSize?.();
        logger.debug('Keyboard: Increase font size', 'FullScreenPlayer');
        break;

      case '-':
        e.preventDefault();
        decreaseFontSize?.();
        logger.debug('Keyboard: Decrease font size', 'FullScreenPlayer');
        break;

      case 'Escape':
        e.preventDefault();
        exitFullScreen();
        logger.debug('Keyboard: Exit full screen', 'FullScreenPlayer');
        break;

      case 'f':
        e.preventDefault();
        document.documentElement.requestFullscreen?.();
        logger.debug('Keyboard: Toggle browser fullscreen', 'FullScreenPlayer');
        break;

      case 'm':
        e.preventDefault();
        toggleMute?.();
        logger.debug('Keyboard: Toggle mute', 'FullScreenPlayer');
        break;
    }
  }, [
    togglePlayPause,
    seekForward,
    seekBackward,
    toggleLyrics,
    increaseFontSize,
    decreaseFontSize,
    exitFullScreen,
    increaseVolume,
    decreaseVolume,
    toggleMute,
  ]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handleKeyPress]);
};
