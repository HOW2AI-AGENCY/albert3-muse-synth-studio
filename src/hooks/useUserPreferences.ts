import { useState, useEffect, useCallback } from 'react';
import { logger } from '@/utils/logger';

export type AccentColor = 'purple' | 'blue' | 'green' | 'pink';
export type DensityMode = 'compact' | 'comfortable' | 'spacious';

interface UserPreferences {
  accentColor: AccentColor;
  densityMode: DensityMode;
  theme: 'light' | 'dark' | 'system';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  accentColor: 'purple',
  densityMode: 'comfortable',
  theme: 'system',
};

const STORAGE_KEY = 'user-preferences';

/**
 * Hook для управления пользовательскими настройками
 * Сохраняет настройки в localStorage и применяет CSS переменные
 */
export const useUserPreferences = () => {
  const [preferences, setPreferencesState] = useState<UserPreferences>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      logger.error('Failed to load user preferences', error as Error, 'useUserPreferences');
    }
    return DEFAULT_PREFERENCES;
  });

  // Применяем CSS переменные при изменении настроек
  useEffect(() => {
    const root = document.documentElement;

    // Accent color mapping
    const accentColors: Record<AccentColor, { hue: number; sat: number; light: number }> = {
      purple: { hue: 271, sat: 91, light: 65 },
      blue: { hue: 221, sat: 83, light: 53 },
      green: { hue: 142, sat: 71, light: 45 },
      pink: { hue: 330, sat: 81, light: 60 },
    };

    const color = accentColors[preferences.accentColor];
    root.style.setProperty('--primary', `${color.hue} ${color.sat}% ${color.light}%`);

    // Density mode spacing
    const densitySpacing: Record<DensityMode, string> = {
      compact: '0.5rem',
      comfortable: '1rem',
      spacious: '1.5rem',
    };

    root.style.setProperty('--spacing-base', densitySpacing[preferences.densityMode]);

    // Font sizes for density
    const densityFontSize: Record<DensityMode, string> = {
      compact: '0.875rem',
      comfortable: '1rem',
      spacious: '1.125rem',
    };

    root.style.setProperty('--font-size-base', densityFontSize[preferences.densityMode]);

    logger.info('User preferences applied', 'useUserPreferences', { preferences });
  }, [preferences]);

  const setPreferences = useCallback((newPreferences: Partial<UserPreferences>) => {
    setPreferencesState((prev) => {
      const updated = { ...prev, ...newPreferences };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (error) {
        logger.error('Failed to save user preferences', error as Error, 'useUserPreferences');
      }
      return updated;
    });
  }, []);

  const setAccentColor = useCallback((color: AccentColor) => {
    setPreferences({ accentColor: color });
  }, [setPreferences]);

  const setDensityMode = useCallback((mode: DensityMode) => {
    setPreferences({ densityMode: mode });
  }, [setPreferences]);

  const setTheme = useCallback((theme: 'light' | 'dark' | 'system') => {
    setPreferences({ theme });
  }, [setPreferences]);

  const resetPreferences = useCallback(() => {
    setPreferencesState(DEFAULT_PREFERENCES);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      logger.error('Failed to reset user preferences', error as Error, 'useUserPreferences');
    }
  }, []);

  // Функция для ручного применения настроек (используется при инициализации)
  const applyPreferences = useCallback(() => {
    const root = document.documentElement;

    // Accent color
    const accentColors: Record<AccentColor, { hue: number; sat: number; light: number }> = {
      purple: { hue: 271, sat: 91, light: 65 },
      blue: { hue: 221, sat: 83, light: 53 },
      green: { hue: 142, sat: 71, light: 45 },
      pink: { hue: 330, sat: 81, light: 60 },
    };

    const color = accentColors[preferences.accentColor];
    root.style.setProperty('--primary', `${color.hue} ${color.sat}% ${color.light}%`);

    // Density mode
    const densitySpacing: Record<DensityMode, string> = {
      compact: '0.5rem',
      comfortable: '1rem',
      spacious: '1.5rem',
    };
    root.style.setProperty('--spacing-base', densitySpacing[preferences.densityMode]);

    const densityFontSize: Record<DensityMode, string> = {
      compact: '0.875rem',
      comfortable: '1rem',
      spacious: '1.125rem',
    };
    root.style.setProperty('--font-size-base', densityFontSize[preferences.densityMode]);
  }, [preferences]);

  return {
    preferences,
    setAccentColor,
    setDensityMode,
    setTheme,
    resetPreferences,
    applyPreferences,
  };
};
