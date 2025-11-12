import { useState, useEffect, useCallback } from 'react';
import type { LyricsSettings } from '@/components/lyrics/LyricsSettingsDialog';
import { logger } from '@/utils/logger';

const STORAGE_KEY = 'albert3-lyrics-settings';

const DEFAULT_SETTINGS: LyricsSettings = {
  fontSize: 'medium',
  scrollSpeed: 5,
  disableWordHighlight: false,
  highContrast: false,
};

/**
 * Hook for managing lyrics display settings with localStorage persistence
 *
 * @returns {object} Settings state and update function
 *
 * @example
 * const { settings, updateSettings } = useLyricsSettings();
 * updateSettings({ fontSize: 'large' });
 */
export const useLyricsSettings = () => {
  const [settings, setSettings] = useState<LyricsSettings>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate parsed settings
        if (
          typeof parsed === 'object' &&
          ['small', 'medium', 'large'].includes(parsed.fontSize) &&
          typeof parsed.scrollSpeed === 'number' &&
          typeof parsed.disableWordHighlight === 'boolean' &&
          typeof parsed.highContrast === 'boolean'
        ) {
          logger.info('Loaded lyrics settings from localStorage', 'useLyricsSettings', {
            settings: parsed,
          });
          return parsed;
        }
      }
    } catch (error) {
      logger.error('Failed to load lyrics settings from localStorage', error as Error, 'useLyricsSettings');
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      logger.info('Saved lyrics settings to localStorage', 'useLyricsSettings', {
         settings,
      });
    } catch (error) {
      logger.error('Failed to save lyrics settings to localStorage', error as Error, 'useLyricsSettings');
    }
  }, [settings]);

  const updateSettings = useCallback((updates: Partial<LyricsSettings>) => {
    setSettings((prev) => ({
       ...prev,
       ...updates,
    }));
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    logger.info('Reset lyrics settings to default', 'useLyricsSettings');
  }, []);

  return {
     settings,
     updateSettings,
     resetSettings,
  };
};
