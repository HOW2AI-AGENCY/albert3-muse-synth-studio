/**
 * useKeyboardShortcuts Hook
 *
 * Global keyboard shortcuts system for music platform
 * Supports player controls, navigation, and actions
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { useEffect, useCallback, useRef } from 'react';
import type { KeyboardShortcutHandler } from '@/types/suno-ui.types';
import { logger } from '@/utils/logger';

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

/**
 * Register keyboard shortcuts
 *
 * @example
 * ```tsx
 * useKeyboardShortcuts([
 *   {
 *     key: ' ', // Space
 *     handler: () => player.togglePlay(),
 *     description: 'Play/Pause',
 *     global: true,
 *   },
 *   {
 *     key: 'k',
 *     handler: () => player.togglePlay(),
 *     description: 'Play/Pause (K)',
 *     global: true,
 *   },
 * ]);
 * ```
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcutHandler[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true, stopPropagation = false } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Ignore shortcuts when typing in input fields (unless global)
      const target = event.target as HTMLElement;
      const isInputField =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      for (const shortcut of shortcutsRef.current) {
        if (shortcut.disabled) continue;

        // Skip if in input field and not global
        if (isInputField && !shortcut.global) continue;

        // Check if key matches
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        if (!keyMatches) continue;

        // Check modifiers
        const ctrlMatches = shortcut.ctrl === undefined || shortcut.ctrl === event.ctrlKey;
        const shiftMatches = shortcut.shift === undefined || shortcut.shift === event.shiftKey;
        const altMatches = shortcut.alt === undefined || shortcut.alt === event.altKey;
        const metaMatches = shortcut.meta === undefined || shortcut.meta === event.metaKey;

        if (ctrlMatches && shiftMatches && altMatches && metaMatches) {
          if (preventDefault) event.preventDefault();
          if (stopPropagation) event.stopPropagation();

          try {
            shortcut.handler(event);
            logger.info(
              `Keyboard shortcut executed: ${shortcut.key}`,
              'keyboard-shortcuts',
              {
                description: shortcut.description,
                ctrl: shortcut.ctrl,
                shift: shortcut.shift,
                alt: shortcut.alt,
                meta: shortcut.meta,
              }
            );
          } catch (error) {
            logger.error(
              `Error executing keyboard shortcut: ${shortcut.key}`,
              error,
              'keyboard-shortcuts'
            );
          }

          break; // Only execute first matching shortcut
        }
      }
    },
    [enabled, preventDefault, stopPropagation]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled, handleKeyDown]);
}

/**
 * Default shortcuts for music player
 */
export function createPlayerShortcuts(player: {
  togglePlay: () => void;
  next: () => void;
  prev: () => void;
  seekForward: (seconds: number) => void;
  seekBackward: (seconds: number) => void;
  volumeUp: () => void;
  volumeDown: () => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
}): KeyboardShortcutHandler[] {
  return [
    // Play/Pause
    {
      key: ' ',
      handler: () => player.togglePlay(),
      description: 'Play/Pause',
      global: true,
    },
    {
      key: 'k',
      handler: () => player.togglePlay(),
      description: 'Play/Pause (K)',
      global: true,
    },
    // Next/Previous
    {
      key: 'l',
      handler: () => player.next(),
      description: 'Next track',
      global: true,
    },
    {
      key: 'j',
      handler: () => player.prev(),
      description: 'Previous track',
      global: true,
    },
    // Seek
    {
      key: 'ArrowRight',
      handler: () => player.seekForward(5),
      description: 'Seek forward 5s',
      global: true,
    },
    {
      key: 'ArrowLeft',
      handler: () => player.seekBackward(5),
      description: 'Seek backward 5s',
      global: true,
    },
    // Volume
    {
      key: 'ArrowUp',
      handler: () => player.volumeUp(),
      description: 'Volume up',
      global: true,
    },
    {
      key: 'ArrowDown',
      handler: () => player.volumeDown(),
      description: 'Volume down',
      global: true,
    },
    // Shuffle/Repeat
    {
      key: 's',
      handler: () => player.toggleShuffle(),
      description: 'Toggle shuffle',
      global: false,
    },
    {
      key: 'r',
      handler: () => player.toggleRepeat(),
      description: 'Toggle repeat',
      global: false,
    },
  ];
}

/**
 * Default shortcuts for navigation
 */
export function createNavigationShortcuts(navigation: {
  focusSearch: () => void;
  openMenu: () => void;
  goHome: () => void;
  goWorkspace: () => void;
}): KeyboardShortcutHandler[] {
  return [
    // Search
    {
      key: '/',
      handler: (e) => {
        navigation.focusSearch();
      },
      description: 'Focus search',
      global: true,
    },
    // Menu
    {
      key: 'm',
      handler: () => navigation.openMenu(),
      description: 'Open menu',
      global: false,
    },
    // Navigation
    {
      key: 'h',
      ctrl: true,
      handler: () => navigation.goHome(),
      description: 'Go to Home',
      global: true,
    },
    {
      key: 'w',
      ctrl: true,
      handler: () => navigation.goWorkspace(),
      description: 'Go to Workspace',
      global: true,
    },
  ];
}

/**
 * Default shortcuts for track actions
 */
export function createTrackActionShortcuts(actions: {
  like: () => void;
  share: () => void;
  download: () => void;
  addToQueue: () => void;
}): KeyboardShortcutHandler[] {
  return [
    {
      key: 'f',
      handler: () => actions.like(),
      description: 'Like/Unlike track',
      global: false,
    },
    {
      key: 's',
      ctrl: true,
      handler: (e) => {
        actions.share();
      },
      description: 'Share track',
      global: false,
    },
    {
      key: 'd',
      ctrl: true,
      handler: (e) => {
        actions.download();
      },
      description: 'Download track',
      global: false,
    },
    {
      key: 'q',
      handler: () => actions.addToQueue(),
      description: 'Add to queue',
      global: false,
    },
  ];
}
