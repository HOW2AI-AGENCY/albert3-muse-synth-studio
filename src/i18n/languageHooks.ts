import { useContext } from 'react';
import type { Language } from './config';
import { LanguageContext, type LanguageContextValue } from './LanguageContextBase';

/**
 * Хук для доступа к контексту языка
 */
export const useLanguage = (): LanguageContextValue => {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }

  return context;
};

/**
 * Хук перевода: возвращает функцию t
 */
export const useTranslation = (): LanguageContextValue['t'] => {
  const { t } = useLanguage();
  return t;
};

/**
 * Хук текущего языка
 */
export const useCurrentLanguage = (): Language => {
  const { language } = useLanguage();
  return language;
};