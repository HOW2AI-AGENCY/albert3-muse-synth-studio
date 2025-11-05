/**
 * Language Context & Provider
 * React context for managing language state and translations
 * Phase 3 improvement from 2025-11-05 audit
 */

import { createContext, useContext, useState, useCallback, useEffect, ReactNode, memo } from 'react';
import {
  Language,
  TranslationKey,
  getPreferredLanguage,
  saveLanguagePreference,
  translate,
  LANGUAGE_NAMES,
} from './config';
import { logger } from '@/utils/logger';

/**
 * Language context value
 */
interface LanguageContextValue {
  /**
   * Current language
   */
  language: Language;

  /**
   * Change language
   */
  setLanguage: (lang: Language) => void;

  /**
   * Translate a key
   */
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;

  /**
   * Get language display name
   */
  getLanguageName: (lang: Language, format?: 'native' | 'english') => string;

  /**
   * Get all available languages
   */
  availableLanguages: Language[];
}

/**
 * Language context
 */
const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

/**
 * Language provider props
 */
interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

/**
 * Language provider component
 */
export const LanguageProvider = memo<LanguageProviderProps>(({ children, defaultLanguage }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    return defaultLanguage || getPreferredLanguage();
  });

  /**
   * Change language and persist preference
   */
  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveLanguagePreference(lang);
    logger.info('Language changed', 'i18n', { language: lang });
  }, []);

  /**
   * Translate function
   */
  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      return translate(language, key, params);
    },
    [language]
  );

  /**
   * Get language display name
   */
  const getLanguageName = useCallback(
    (lang: Language, format: 'native' | 'english' = 'native'): string => {
      return LANGUAGE_NAMES[lang][format];
    },
    []
  );

  /**
   * Available languages
   */
  const availableLanguages: Language[] = ['ru', 'en'];

  /**
   * Update document language attribute
   */
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value: LanguageContextValue = {
    language,
    setLanguage,
    t,
    getLanguageName,
    availableLanguages,
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
});

LanguageProvider.displayName = 'LanguageProvider';

/**
 * Hook to use language context
 * @returns Language context value
 * @throws Error if used outside LanguageProvider
 */
export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
};

/**
 * Hook to use translations
 * Convenience hook that returns only the translate function
 * @returns Translate function
 */
export const useTranslation = (): LanguageContextValue['t'] => {
  const { t } = useLanguage();
  return t;
};

/**
 * Hook to get current language
 * @returns Current language code
 */
export const useCurrentLanguage = (): Language => {
  const { language } = useLanguage();
  return language;
};
