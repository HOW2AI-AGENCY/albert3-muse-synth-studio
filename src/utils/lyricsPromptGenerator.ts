/**
 * Утилиты для автоматической генерации промптов лирики
 * на основе контекста проекта, трека и референсов
 */

interface LyricsPromptContext {
  trackTitle?: string;
  trackPrompt?: string;
  projectName?: string;
  projectGenre?: string;
  projectMood?: string;
  projectDescription?: string;
  styleTags?: string[];
  tempo?: string;
  instruments?: string[];
}

/**
 * Генерирует промпт для AI генерации лирики на основе контекста
 */
export const generateLyricsPrompt = (context: LyricsPromptContext): string => {
  const parts: string[] = [];

  // Основа - название трека или тема проекта
  if (context.trackTitle) {
    parts.push(`Write lyrics for a song titled "${context.trackTitle}"`);
  } else if (context.projectName) {
    parts.push(`Write lyrics for a song from the project "${context.projectName}"`);
  } else {
    parts.push('Write song lyrics');
  }

  // Жанр и настроение
  if (context.projectGenre) {
    parts.push(`in ${context.projectGenre} style`);
  }

  if (context.projectMood) {
    parts.push(`with ${context.projectMood} mood`);
  }

  // Стилистические теги
  if (context.styleTags && context.styleTags.length > 0) {
    const tags = context.styleTags.slice(0, 3).join(', ');
    parts.push(`incorporating ${tags} elements`);
  }

  // Контекст из промпта трека
  if (context.trackPrompt && context.trackPrompt.length > 20) {
    parts.push(`\n\nTrack context: ${context.trackPrompt}`);
  }

  // Описание проекта (если есть)
  if (context.projectDescription && context.projectDescription.length > 20) {
    parts.push(`\n\nProject theme: ${context.projectDescription}`);
  }

  // Инструменты (если указаны)
  if (context.instruments && context.instruments.length > 0) {
    parts.push(`\n\nInstruments: ${context.instruments.join(', ')}`);
  }

  return parts.join(' ');
};

/**
 * Генерирует короткую подсказку для пользователя
 */
export const generateLyricsHint = (context: LyricsPromptContext): string => {
  const parts: string[] = [];

  if (context.trackTitle) {
    parts.push(`"${context.trackTitle}"`);
  }

  if (context.projectGenre) {
    parts.push(context.projectGenre);
  }

  if (context.projectMood) {
    parts.push(context.projectMood);
  }

  return parts.length > 0 ? parts.join(' • ') : 'Сгенерировать лирику с AI';
};
