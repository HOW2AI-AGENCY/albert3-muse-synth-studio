/**
 * i18n Module
 * Internationalization system exports
 * Phase 3 improvement from 2025-11-05 audit
 */

// Configuration
export type { Language, Translations, TranslationKey } from './config';
export {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LANGUAGE_NAMES,
  translations,
  getPreferredLanguage,
  saveLanguagePreference,
  translate,
} from './config';

// Context & Hooks
export { LanguageProvider } from './LanguageContext';
export { useLanguage, useTranslation, useCurrentLanguage } from './languageHooks';

// Components
export { LanguageSwitcher } from './components/LanguageSwitcher';
