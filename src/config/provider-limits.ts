/**
 * Provider-specific limits and configurations
 * Централизованные лимиты и настройки для Suno и Mureka
 */

import type { MusicProvider } from './provider-models';

// Re-export MusicProvider for convenience
export type { MusicProvider } from './provider-models';

export interface ProviderLimits {
  prompt: {
    min: number;
    max: number;
    recommended: number;
  };
  lyrics: {
    min: number;
    max: number;
    recommended: number;
  };
  title: {
    min: number;
    max: number;
  };
  tags: {
    min: number;
    max: number;
    recommended: number;
  };
  duration: {
    min: number; // seconds
    max: number; // seconds
  };
}

export interface ProviderFeatures {
  referenceAudio: boolean;
  extend: boolean;
  createCover: boolean;
  customMode: boolean;
  instrumentalMode: boolean;
  vocalGenderSelection: boolean;
  negativeTags: boolean;
  styleWeight: boolean;
  audioWeight: boolean;
  lyricsWeight: boolean;
  weirdnessConstraint: boolean;
  stemSeparation: {
    supported: boolean;
    modes: ('separate_vocal' | 'split_stem')[];
    downloadAsZip: boolean; // Mureka returns ZIP
  };
}

export interface ProviderConfig {
  name: string;
  displayName: string;
  description: string;
  limits: ProviderLimits;
  features: ProviderFeatures;
  warnings: {
    promptTooShort?: string;
    promptTooLong?: string;
    lyricsTooLong?: string;
    noReferenceAudio?: string;
  };
}

export const PROVIDER_CONFIGS: Record<MusicProvider, ProviderConfig> = {
  suno: {
    name: 'suno',
    displayName: 'Suno AI',
    description: 'Полнофункциональный AI генератор музыки с поддержкой референсов',
    limits: {
      prompt: {
        min: 10,
        max: 500,
        recommended: 100,
      },
      lyrics: {
        min: 0,
        max: 3000,
        recommended: 500,
      },
      title: {
        min: 0,
        max: 80,
      },
      tags: {
        min: 0,
        max: 120,
        recommended: 50,
      },
      duration: {
        min: 30,
        max: 240, // 4 минуты
      },
    },
    features: {
      referenceAudio: true, // ✅ Только Suno поддерживает референс
      extend: true, // ✅ Только Suno поддерживает extend
      createCover: true, // ✅ Только Suno поддерживает cover
      customMode: true,
      instrumentalMode: true,
      vocalGenderSelection: true,
      negativeTags: true,
      styleWeight: true,
      audioWeight: true,
      lyricsWeight: true,
      weirdnessConstraint: true,
      stemSeparation: {
        supported: true,
        modes: ['separate_vocal', 'split_stem'],
        downloadAsZip: false, // Suno возвращает отдельные стемы
      },
    },
    warnings: {
      promptTooShort: 'Слишком короткое описание. Добавьте больше деталей для лучшего результата (рекомендуется от 100 символов)',
      promptTooLong: 'Описание слишком длинное. Сократите до 500 символов',
      lyricsTooLong: 'Текст слишком длинный. Максимум 3000 символов',
    },
  },
  mureka: {
    name: 'mureka',
    displayName: 'Mureka AI',
    description: 'Быстрый AI генератор с автоматической генерацией текстов',
    limits: {
      prompt: {
        min: 5,
        max: 500, // ✅ Mureka тоже имеет лимит 500
        recommended: 80,
      },
      lyrics: {
        min: 0,
        max: 2000,
        recommended: 400,
      },
      title: {
        min: 0,
        max: 60,
      },
      tags: {
        min: 0,
        max: 100,
        recommended: 40,
      },
      duration: {
        min: 20,
        max: 180, // 3 минуты
      },
    },
    features: {
      referenceAudio: false, // ❌ Mureka НЕ поддерживает референс
      extend: false, // ❌ Mureka НЕ поддерживает extend
      createCover: false, // ❌ Mureka НЕ поддерживает cover
      customMode: true,
      instrumentalMode: true, // через isBGM
      vocalGenderSelection: false, // Mureka не поддерживает выбор пола
      negativeTags: false,
      styleWeight: false,
      audioWeight: false,
      lyricsWeight: false,
      weirdnessConstraint: false,
      stemSeparation: {
        supported: true,
        modes: ['split_stem'], // Только split_stem для Mureka
        downloadAsZip: true, // ✅ Mureka возвращает ZIP-архив
      },
    },
    warnings: {
      promptTooShort: 'Короткое описание. Рекомендуется от 80 символов для лучшего результата',
      promptTooLong: 'Описание слишком длинное. Максимум 500 символов',
      lyricsTooLong: 'Текст слишком длинный. Максимум 2000 символов',
      noReferenceAudio: 'Mureka не поддерживает референсное аудио. Используйте Suno для этой функции',
    },
  },
};

/**
 * Получить конфиг провайдера
 */
export function getProviderConfig(provider: MusicProvider): ProviderConfig {
  return PROVIDER_CONFIGS[provider];
}

/**
 * Проверить поддержку функции провайдером
 */
export function isFeatureSupported(provider: MusicProvider, feature: keyof ProviderFeatures): boolean {
  const config = PROVIDER_CONFIGS[provider];
  const featureValue = config.features[feature];
  
  // Handle nested stemSeparation
  if (typeof featureValue === 'object') {
    return featureValue.supported;
  }
  
  return Boolean(featureValue);
}

/**
 * Валидация промпта для провайдера
 */
export function validatePrompt(provider: MusicProvider, prompt: string): {
  valid: boolean;
  warning?: string;
  error?: string;
} {
  const config = PROVIDER_CONFIGS[provider];
  const length = prompt.trim().length;
  
  if (length === 0) {
    return { valid: false, error: 'Промпт не может быть пустым' };
  }
  
  if (length < config.limits.prompt.min) {
    return { valid: false, error: `Минимум ${config.limits.prompt.min} символов` };
  }
  
  if (length > config.limits.prompt.max) {
    return { valid: false, error: config.warnings.promptTooLong };
  }
  
  if (length < config.limits.prompt.recommended) {
    return { valid: true, warning: config.warnings.promptTooShort };
  }
  
  return { valid: true };
}

/**
 * Валидация текста для провайдера
 */
export function validateLyrics(provider: MusicProvider, lyrics: string): {
  valid: boolean;
  warning?: string;
  error?: string;
} {
  const config = PROVIDER_CONFIGS[provider];
  const length = lyrics.trim().length;
  
  if (length === 0) {
    return { valid: true }; // Lyrics optional
  }
  
  if (length > config.limits.lyrics.max) {
    return { valid: false, error: config.warnings.lyricsTooLong };
  }
  
  return { valid: true };
}
