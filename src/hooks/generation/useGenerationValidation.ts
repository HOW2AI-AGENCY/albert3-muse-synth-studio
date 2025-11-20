import { useCallback } from 'react';
import { GenerationRequest } from '@/services/generation';

export const useGenerationValidation = () => {
  const validate = useCallback((options: GenerationRequest) => {
    const errors: string[] = [];
    const effectivePrompt = options.prompt?.trim() ?? '';

    if (!effectivePrompt) {
      errors.push('Пожалуйста, введите описание музыки');
    }

    if (effectivePrompt.length > 3000) {
      errors.push('Описание не должно превышать 3000 символов');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }, []);

  return { validate };
};
