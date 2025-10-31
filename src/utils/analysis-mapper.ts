/**
 * @fileoverview Утилита для маппинга результатов Mureka Analysis в параметры генерации
 * @description
 * Конвертирует данные из song_recognitions и song_descriptions
 * в формат GenerationParams для автоматического заполнения формы.
 * 
 * @module analysis-mapper
 * @version 1.0.0
 * @since 2025-10-31
 */

import type { GenerationParams } from '@/components/generator/types/generator.types';
import type { SongRecognition, SongDescription } from '@/hooks/useReferenceAnalysis';
import { logger } from '@/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Объединенные данные анализа
 */
export interface MurekaAnalysisData {
  // Recognition data
  recognized_title?: string;
  recognized_artist?: string;
  recognized_album?: string;
  
  // Description data
  detected_genre?: string;
  detected_mood?: string;
  tempo_bpm?: number;
  detected_instruments?: string[];
  ai_description?: string;
  key_signature?: string;
  time_signature?: string;
  energy_level?: number;
  danceability?: number;
  valence?: number;
}

/**
 * Результат маппинга
 */
export interface MappingResult {
  updates: Partial<GenerationParams>;
  appliedFields: string[];
  skippedFields: string[];
}

// ============================================================================
// GENRE TO STYLE TAGS MAPPING
// ============================================================================

/**
 * Конвертация жанра в style tags
 */
export function genreToStyleTags(genre: string): string[] {
  const genreMap: Record<string, string[]> = {
    'rock': ['rock', 'electric guitar', 'drums'],
    'pop': ['pop', 'catchy', 'upbeat'],
    'jazz': ['jazz', 'saxophone', 'piano', 'swing'],
    'classical': ['classical', 'orchestra', 'strings'],
    'electronic': ['electronic', 'synthesizer', 'edm'],
    'hip-hop': ['hip-hop', 'rap', 'beats'],
    'r&b': ['r&b', 'soul', 'smooth'],
    'country': ['country', 'acoustic', 'guitar'],
    'metal': ['metal', 'heavy', 'distorted'],
    'folk': ['folk', 'acoustic', 'storytelling'],
    'blues': ['blues', 'guitar', 'soulful'],
    'reggae': ['reggae', 'upbeat', 'rhythmic'],
    'funk': ['funk', 'groovy', 'bass'],
    'disco': ['disco', 'dance', 'retro'],
    'indie': ['indie', 'alternative', 'creative'],
    'ambient': ['ambient', 'atmospheric', 'peaceful'],
    'lo-fi': ['lo-fi', 'chill', 'relaxed'],
  };
  
  const genreLower = genre.toLowerCase();
  return genreMap[genreLower] || [genre];
}

// ============================================================================
// MAIN MAPPING FUNCTION
// ============================================================================

/**
 * Маппинг результатов анализа в параметры генерации
 * 
 * @param recognition - Результаты распознавания
 * @param description - Результаты AI-описания
 * @param currentParams - Текущие параметры генерации
 * @returns Объект с обновлениями и статистикой
 * 
 * @example
 * ```typescript
 * const result = mapAnalysisToGenerationParams(
 *   recognition,
 *   description,
 *   currentParams
 * );
 * 
 * // Применить обновления
 * if (result.updates.title) {
 *   setParam('title', result.updates.title);
 * }
 * ```
 */
export function mapAnalysisToGenerationParams(
  recognition: SongRecognition | null,
  description: SongDescription | null,
  currentParams: GenerationParams
): MappingResult {
  const updates: Partial<GenerationParams> = {};
  const appliedFields: string[] = [];
  const skippedFields: string[] = [];

  logger.info('📊 [MAPPER] Starting analysis mapping', 'analysis-mapper', {
    hasRecognition: !!recognition,
    hasDescription: !!description,
    currentTitle: currentParams.title?.substring(0, 30),
    currentPrompt: currentParams.prompt?.substring(0, 30),
  });

  // ============================================================================
  // 1️⃣ TITLE MAPPING
  // ============================================================================

  if (recognition?.recognized_title && !currentParams.title.trim()) {
    const title = recognition.recognized_title;
    const artist = recognition.recognized_artist;
    
    updates.title = artist 
      ? `${title} (Cover by AI)`
      : title;
    
    appliedFields.push('title');
    logger.info('✅ [MAPPER] Title applied', 'analysis-mapper', { title: updates.title });
  } else if (recognition?.recognized_title && currentParams.title.trim()) {
    skippedFields.push('title (already filled)');
  }

  // ============================================================================
  // 2️⃣ STYLE TAGS MAPPING
  // ============================================================================

  const newTags: string[] = [];
  
  // Жанр → теги
  if (description?.detected_genre) {
    const genreTags = genreToStyleTags(description.detected_genre);
    newTags.push(...genreTags);
    appliedFields.push('genre');
  }
  
  // Инструменты → теги
  if (description?.detected_instruments && description.detected_instruments.length > 0) {
    // Берем до 5 инструментов
    newTags.push(...description.detected_instruments.slice(0, 5));
    appliedFields.push('instruments');
  }

  // Объединяем с существующими тегами
  if (newTags.length > 0) {
    const existingTags = currentParams.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    
    const uniqueTags = Array.from(new Set([...existingTags, ...newTags]));
    
    if (uniqueTags.length > existingTags.length) {
      updates.tags = uniqueTags.join(', ');
      logger.info('✅ [MAPPER] Tags applied', 'analysis-mapper', { 
        added: uniqueTags.length - existingTags.length,
        tags: newTags
      });
    }
  }

  // ============================================================================
  // 3️⃣ PROMPT MAPPING
  // ============================================================================

  if (!currentParams.prompt.trim() && description) {
    const promptParts: string[] = [];
    
    // Жанр
    if (description.detected_genre) {
      promptParts.push(`${description.detected_genre} style`);
    }
    
    // Настроение
    if (description.detected_mood) {
      promptParts.push(`${description.detected_mood} mood`);
    }
    
    // Темп
    if (description.tempo_bpm) {
      const tempoDesc = description.tempo_bpm > 120 ? 'fast tempo' : 'slow tempo';
      promptParts.push(`${tempoDesc} (${description.tempo_bpm} BPM)`);
    }
    
    // Тональность
    if (description.key_signature) {
      promptParts.push(`in key of ${description.key_signature}`);
    }
    
    // AI описание
    if (description.ai_description) {
      promptParts.push(`\n\n${description.ai_description}`);
    }
    
    if (promptParts.length > 0) {
      updates.prompt = promptParts.join(', ');
      appliedFields.push('prompt');
      logger.info('✅ [MAPPER] Prompt generated', 'analysis-mapper', { 
        prompt: updates.prompt?.substring(0, 100)
      });
    }
  } else if (currentParams.prompt.trim()) {
    skippedFields.push('prompt (already filled)');
  }

  // ============================================================================
  // SUMMARY
  // ============================================================================

  logger.info('✅ [MAPPER] Mapping completed', 'analysis-mapper', {
    appliedFields,
    skippedFields,
    hasUpdates: Object.keys(updates).length > 0
  });

  return {
    updates,
    appliedFields,
    skippedFields
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Построить промпт из характеристик анализа
 */
export function buildPromptFromAnalysis(analysis: {
  genre?: string;
  mood?: string;
  tempo?: number;
  description?: string;
  instruments?: string[];
  key?: string;
}): string {
  const parts: string[] = [];
  
  if (analysis.genre) {
    parts.push(`${analysis.genre} track`);
  }
  
  if (analysis.mood) {
    parts.push(`with ${analysis.mood} mood`);
  }
  
  if (analysis.tempo) {
    const tempoDesc = analysis.tempo > 120 ? 'fast tempo' : 'slow tempo';
    parts.push(`${tempoDesc} (${analysis.tempo} BPM)`);
  }
  
  if (analysis.key) {
    parts.push(`in key of ${analysis.key}`);
  }
  
  if (analysis.instruments && analysis.instruments.length > 0) {
    parts.push(`featuring ${analysis.instruments.slice(0, 3).join(', ')}`);
  }
  
  if (analysis.description) {
    parts.push(`\n\n${analysis.description}`);
  }
  
  return parts.join(', ');
}

/**
 * Конвертация характеристик описания в удобочитаемую строку
 */
export function formatAnalysisToString(description: SongDescription): string {
  const parts: string[] = [];
  
  if (description.detected_genre) parts.push(description.detected_genre);
  if (description.detected_mood) parts.push(description.detected_mood);
  if (description.tempo_bpm) parts.push(`${description.tempo_bpm} BPM`);
  if (description.key_signature) parts.push(description.key_signature);
  
  return parts.join(' · ');
}
