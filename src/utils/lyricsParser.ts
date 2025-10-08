import { Tag, Section, SongDocument, LintIssue } from '@/types/lyrics';
import { TAG_DEFINITIONS, CATEGORY_COLORS } from '@/data/tagDefinitions';

/**
 * Lyrics Parser Utilities
 * Парсинг текста с тегами в структурированный формат
 */

// Regex для извлечения тегов из текста
const TAG_REGEX = /\[([^\]]+)\]/g;

/**
 * Извлечь все теги из текста
 */
export function extractTags(text: string): Tag[] {
  const tags: Tag[] = [];
  const matches = text.matchAll(TAG_REGEX);

  for (const match of matches) {
    const rawTag = match[0]; // "[Chorus]"
    const value = match[1].trim(); // "Chorus"

    const tag = parseTag(value, rawTag);
    if (tag) {
      tags.push(tag);
    }
  }

  return tags;
}

/**
 * Определить категорию и метаданные тега
 */
export function parseTag(value: string, raw: string): Tag | null {
  const id = `tag-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  // Проверяем каждую категорию
  for (const [category, definition] of Object.entries(TAG_DEFINITIONS)) {
    // Exact match
    if (definition.values.includes(value)) {
      return {
        id,
        category: definition.category,
        value,
        raw,
        icon: definition.icon,
        color: CATEGORY_COLORS[definition.category as keyof typeof CATEGORY_COLORS],
        description: definition.description
      };
    }

    // Partial match для Tempo/Key
    if (category === 'tempo' && value.startsWith('Tempo:')) {
      return {
        id,
        category: 'tempo',
        value,
        raw,
        icon: 'gauge',
        color: CATEGORY_COLORS.tempo,
        description: 'Tempo setting'
      };
    }

    if (category === 'key' && value.startsWith('Key:')) {
      return {
        id,
        category: 'key',
        value,
        raw,
        icon: 'music',
        color: CATEGORY_COLORS.key,
        description: 'Musical key'
      };
    }

    if (category === 'language' && value.startsWith('Language:')) {
      return {
        id,
        category: 'language',
        value,
        raw,
        icon: 'globe',
        color: CATEGORY_COLORS.language,
        description: 'Vocal language'
      };
    }

    if (category === 'meta' && (value.startsWith('Mix:') || value.startsWith('Master:'))) {
      return {
        id,
        category: 'meta',
        value,
        raw,
        icon: 'settings',
        color: CATEGORY_COLORS.meta,
        description: 'Mix/Master setting'
      };
    }
  }

  // Unknown tag - return as custom
  return {
    id,
    category: 'meta',
    value,
    raw,
    icon: 'tag',
    color: 'bg-gray-400 text-white',
    description: 'Custom tag'
  };
}

/**
 * Парсинг текста лирики в секции
 */
export function parseLyrics(text: string): Section[] {
  const sections: Section[] = [];
  const lines = text.split('\n');

  let currentSection: Section | null = null;
  let order = 0;

  for (const line of lines) {
    const trimmedLine = line.trim();

    // Skip empty lines at the start
    if (!trimmedLine && !currentSection) continue;

    // Извлекаем теги из строки
    const tags = extractTags(trimmedLine);
    const sectionTags = tags.filter(t => t.category === 'section');

    // Если нашли section tag - начинаем новую секцию
    if (sectionTags.length > 0) {
      // Сохраняем предыдущую секцию
      if (currentSection) {
        sections.push(currentSection);
      }

      // Создаем новую секцию
      const sectionTag = sectionTags[0];
      currentSection = {
        id: `section-${Date.now()}-${order}`,
        title: sectionTag.value,
        tags: tags.filter(t => t.category !== 'section'), // non-section tags
        lines: [],
        order: order++
      };
    } else if (currentSection) {
      // Добавляем строку в текущую секцию (без тегов)
      const lineWithoutTags = trimmedLine.replace(TAG_REGEX, '').trim();
      if (lineWithoutTags) {
        currentSection.lines.push(lineWithoutTags);
      }
      // Добавляем теги к секции
      currentSection.tags.push(...tags.filter(t => t.category !== 'section'));
    } else if (trimmedLine) {
      // Если нет текущей секции - создаем "Untitled"
      currentSection = {
        id: `section-${Date.now()}-${order}`,
        title: 'Untitled',
        tags: tags.filter(t => t.category !== 'section'),
        lines: [trimmedLine.replace(TAG_REGEX, '').trim()].filter(Boolean),
        order: order++
      };
    }
  }

  // Добавляем последнюю секцию
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Экспорт секций обратно в текст с тегами
 */
export function exportToSunoFormat(document: SongDocument): string {
  const lines: string[] = [];

  // Global tags сверху
  if (document.globalTags.length > 0) {
    const globalTagsStr = document.globalTags.map(t => t.raw).join(' ');
    lines.push(globalTagsStr);
    lines.push(''); // Empty line
  }

  // Секции
  for (const section of document.sections) {
    // Section title with tags
    const sectionTags = section.tags.map(t => t.raw).join(' ');
    const sectionHeader = `[${section.title}]${sectionTags ? ' ' + sectionTags : ''}`;
    lines.push(sectionHeader);

    // Lyric lines
    section.lines.forEach(line => {
      lines.push(line);
    });

    lines.push(''); // Empty line after section
  }

  return lines.join('\n').trim();
}

/**
 * Lint проверка для тегов
 */
export function lintDocument(document: SongDocument): LintIssue[] {
  const issues: LintIssue[] = [];

  // Проверка на конфликтующие жанры
  const instrumentTags = document.sections
    .flatMap(s => s.tags)
    .filter(t => t.category === 'instrument');

  if (instrumentTags.length > 5) {
    issues.push({
      id: `lint-${Date.now()}-instrument`,
      severity: 'warning',
      message: `Too many instruments (${instrumentTags.length}). Consider focusing on 2-3 key instruments.`,
      suggestion: 'Remove less important instruments'
    });
  }

  // Проверка на множественные эмоции
  document.sections.forEach(section => {
    const emotionTags = section.tags.filter(t => t.category === 'emotion');
    if (emotionTags.length > 2) {
      issues.push({
        id: `lint-${Date.now()}-${section.id}`,
        severity: 'warning',
        message: `Section "${section.title}" has ${emotionTags.length} emotions. Use 1-2 for clarity.`,
        sectionId: section.id,
        suggestion: 'Keep 1-2 primary emotions'
      });
    }
  });

  // Проверка на пустые секции
  document.sections.forEach(section => {
    if (section.lines.length === 0 && section.tags.length === 0) {
      issues.push({
        id: `lint-${Date.now()}-${section.id}`,
        severity: 'error',
        message: `Section "${section.title}" is empty`,
        sectionId: section.id,
        suggestion: 'Add lyrics or tags, or remove the section'
      });
    }
  });

  // Проверка на отсутствие Chorus
  const hasChorus = document.sections.some(s => s.title.toLowerCase().includes('chorus'));
  if (document.sections.length > 2 && !hasChorus) {
    issues.push({
      id: `lint-${Date.now()}-structure`,
      severity: 'info',
      message: 'Consider adding a Chorus section for better song structure',
      suggestion: 'Add [Chorus] section'
    });
  }

  return issues;
}

/**
 * Удалить дубликаты тегов
 */
export function deduplicateTags(tags: Tag[]): Tag[] {
  const seen = new Set<string>();
  return tags.filter(tag => {
    if (seen.has(tag.value)) {
      return false;
    }
    seen.add(tag.value);
    return true;
  });
}
