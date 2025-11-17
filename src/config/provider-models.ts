/**
 * Константы моделей для различных музыкальных провайдеров
 * ✅ SINGLE SOURCE OF TRUTH для типа MusicProvider
 */

export type MusicProvider = 'suno';

export interface ModelVersion {
  value: string;
  label: string;
  description?: string;
  isDefault?: boolean;
  features?: string[];
}

export const PROVIDER_MODELS = {
  suno: [
    { value: 'V5', label: 'v5', description: 'Новейшая модель с улучшенным качеством звука и вокала', isDefault: true, features: ['vocals', 'instrumental', 'high-quality'] },
    { value: 'V4_5PLUS', label: 'v4.5+', description: 'Расширенная версия v4.5 с дополнительными возможностями', isDefault: false, features: ['vocals', 'instrumental'] },
    { value: 'V4_5', label: 'v4.5', description: 'Стабильная модель с хорошим балансом качества и скорости', isDefault: false, features: ['vocals', 'instrumental'] },
    { value: 'V4', label: 'v4', description: 'Проверенная модель с надежными результатами', isDefault: false, features: ['vocals', 'instrumental'] },
    { value: 'V3_5', label: 'v3.5', description: 'Классическая модель для быстрой генерации', isDefault: false, features: ['vocals', 'instrumental'] },
  ],
} as const satisfies Record<MusicProvider, readonly ModelVersion[]>;

/**
 * Получить список моделей для провайдера
 */
export function getProviderModels(provider: MusicProvider): readonly ModelVersion[] {
  return PROVIDER_MODELS[provider];
}

/**
 * Получить модель по умолчанию для провайдера
 */
export function getDefaultModel(provider: MusicProvider): ModelVersion {
  const models = PROVIDER_MODELS[provider];
  const defaultModel = models.find(m => m.isDefault);
  return defaultModel || models[0];
}

/**
 * Проверить валидность модели для провайдера
 */
export function isValidModelForProvider(provider: MusicProvider, modelValue: string): boolean {
  return PROVIDER_MODELS[provider].some(m => m.value === modelValue);
}

/**
 * Получить модель по значению
 */
export function getModelByValue(provider: MusicProvider, value: string): ModelVersion | undefined {
  return PROVIDER_MODELS[provider].find(m => m.value === value);
}
