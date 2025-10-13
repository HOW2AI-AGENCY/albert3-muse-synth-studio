/**
 * Константы моделей для различных музыкальных провайдеров
 */

export type MusicProvider = 'suno' | 'mureka';

export interface ModelVersion {
  value: string;
  label: string;
  isDefault?: boolean;
  features?: string[];
}

export const PROVIDER_MODELS = {
  suno: [
    { value: 'V5', label: 'v5', isDefault: true, features: ['vocals', 'instrumental', 'high-quality'] },
    { value: 'V4_5PLUS', label: 'v4.5+', isDefault: false, features: ['vocals', 'instrumental'] },
    { value: 'V4_5', label: 'v4.5', isDefault: false, features: ['vocals', 'instrumental'] },
    { value: 'V4', label: 'v4', isDefault: false, features: ['vocals', 'instrumental'] },
    { value: 'V3_5', label: 'v3.5', isDefault: false, features: ['vocals', 'instrumental'] },
  ],
  mureka: [
    { value: 'auto', label: 'Auto', isDefault: true, features: ['auto-select'] },
    { value: 'mureka-6', label: 'v6', isDefault: false, features: ['standard'] },
    { value: 'mureka-7.5', label: 'v7.5', isDefault: false, features: ['enhanced'] },
    { value: 'mureka-o1', label: 'O1', isDefault: false, features: ['premium', 'high-quality'] },
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
