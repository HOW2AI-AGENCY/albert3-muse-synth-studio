import { createContext } from 'react';
import type { Language, TranslationKey } from './config';

/**
 * Базовые типы и контекст i18n, вынесены в отдельный файл,
 * чтобы файл провайдера экспортировал только компонент.
 */
export interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  getLanguageName: (lang: Language, format?: 'native' | 'english') => string;
  availableLanguages: Language[];
}

export const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);