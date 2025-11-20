/**
 * i18n Configuration
 * Internationalization system for RU/EN localization
 * Phase 3 improvement from 2025-11-05 audit
 */

import enTranslations from './locales/en.json';
import ruTranslations from './locales/ru.json';
import { logger } from '@/utils/logger';

/**
 * Supported languages
 */
export type Language = 'ru' | 'en';

/**
 * Translation keys structure (inferred from JSON)
 */
export type Translations = typeof enTranslations;

/**
 * Available translations by language
 */
export const translations: Record<Language, Translations> = {
  en: enTranslations,
  ru: ruTranslations,
};

/**
 * Default language
 */
export const DEFAULT_LANGUAGE: Language = 'ru';

/**
 * Local storage key for language preference
 */
export const LANGUAGE_STORAGE_KEY = 'app-language';

/**
 * Get user's preferred language from:
 * 1. Local storage (previously selected)
 * 2. Browser language
 * 3. Default language (ru)
 */
export const getPreferredLanguage = (): Language => {
  try {
    // Check local storage first
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && (stored === 'ru' || stored === 'en')) {
      return stored;
    }

    // Check browser language
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('ru')) {
      return 'ru';
    }
    if (browserLang.startsWith('en')) {
      return 'en';
    }
  } catch {
    // localStorage not available (SSR, private browsing, etc.)
  }

  return DEFAULT_LANGUAGE;
};

/**
 * Save language preference to local storage
 */
export const saveLanguagePreference = (lang: Language): void => {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // Ignore localStorage errors
  }
};

/**
 * Get nested translation value by key path
 * @example
 * getNestedValue({ status: { pending: 'Pending' } }, 'status.pending') // 'Pending'
 */
export const getNestedValue = (obj: Record<string, unknown>, path: string): unknown => {
  return path.split('.').reduce((current: any, key) => current?.[key], obj);
};

/**
 * Replace interpolation placeholders in translation string
 * @example
 * interpolate('Hello {{name}}', { name: 'World' }) // 'Hello World'
 */
export const interpolate = (str: string, params?: Record<string, string | number>): string => {
  if (!params) return str;

  return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = params[key];
    return value !== undefined ? String(value) : match;
  });
};

/**
 * Type-safe translation key paths
 * @example
 * 'status.pending' | 'tracks.title' | 'generation.prompt'
 */
export type TranslationKey =
  | `status.${keyof Translations['status']}`
  | `statusDescription.${keyof Translations['statusDescription']}`
  | `tracks.${keyof Translations['tracks']}`
  | `trackActions.${keyof Translations['trackActions']}`
  | `trackDetails.${keyof Translations['trackDetails']}`
  | `generation.${keyof Translations['generation']}`
  | `project.${keyof Translations['project']}`
  | `reference.${keyof Translations['reference']}`
  | `statistics.${keyof Translations['statistics']}`
  | `sort.${keyof Translations['sort']}`
  | `filter.${keyof Translations['filter']}`
  | `common.${keyof Translations['common']}`
  | `validation.${keyof Translations['validation']}`
  | `toast.${keyof Translations['toast']}`
  | `accessibility.${keyof Translations['accessibility']}`
  | `errors.${keyof Translations['errors']}`
  | `mobile.${keyof Translations['mobile']}`;

/**
 * Get translation for a key
 * @param lang - Language code
 * @param key - Translation key path
 * @param params - Interpolation parameters
 * @returns Translated string
 */
export const translate = (
  lang: Language,
  key: TranslationKey,
  params?: Record<string, string | number>
): string => {
  const translation = getNestedValue(translations[lang], key);

  if (typeof translation !== 'string') {
    logger.warn(`Translation not found: ${key} (${lang})`, 'i18n', { key, lang });
    return key;
  }

  return interpolate(translation, params);
};

/**
 * Language display names
 */
export const LANGUAGE_NAMES: Record<Language, { native: string; english: string }> = {
  ru: { native: 'Русский', english: 'Russian' },
  en: { native: 'English', english: 'English' },
};
