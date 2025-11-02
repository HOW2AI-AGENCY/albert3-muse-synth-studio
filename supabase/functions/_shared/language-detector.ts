/**
 * Language Detection Utility
 * Detects language from text and adds appropriate hints for AI models
 */

/**
 * Detect language from text (Cyrillic = Russian, otherwise English)
 */
export function detectLanguage(text: string): 'ru' | 'en' {
  const cyrillicPattern = /[а-яА-ЯёЁ]/;
  return cyrillicPattern.test(text) ? 'ru' : 'en';
}

/**
 * Add language hint to prompt if needed
 * For Russian prompts, adds instruction to generate lyrics in Russian
 */
export function addLanguageHint(prompt: string, lyrics?: string): string {
  const textToCheck = lyrics || prompt;
  const lang = detectLanguage(textToCheck);
  
  // Check if there's already explicit language instruction
  const hasExplicitLang = /(language\s*:)|\b(english|английск)|(russian|русск)/i.test(prompt);
  
  if (lang === 'ru' && !hasExplicitLang) {
    return `${prompt}\n\nGenerate song lyrics in Russian language. Создай текст песни на русском языке.`;
  }
  
  return prompt;
}

/**
 * Check if text contains Cyrillic characters
 */
export function isCyrillic(text: string): boolean {
  return /[а-яА-ЯёЁ]/.test(text);
}
