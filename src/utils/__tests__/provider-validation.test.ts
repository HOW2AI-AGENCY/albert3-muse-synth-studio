/**
 * Provider Validation Unit Tests
 * 
 * @module utils/__tests__/provider-validation.test
 */

import { describe, it, expect } from 'vitest';
import {
  validateGenerationParams,
  validateExtensionParams,
  validateStemSeparationParams,
  safeValidateGenerationParams,
  isValidModelForProvider,
  getDefaultModelForProvider,
  getValidModelsForProvider
} from '../provider-validation';

describe('Provider Validation', () => {
  describe('validateGenerationParams', () => {
    it('should validate valid Suno params', () => {
      const params = {
        provider: 'suno',
        prompt: 'Epic orchestral music',
        modelVersion: 'V5',
        styleTags: ['orchestral', 'cinematic'],
        hasVocals: true
      };
      
      expect(() => validateGenerationParams(params)).not.toThrow();
    });

    it('should validate valid Mureka params', () => {
      const params = {
        provider: 'mureka',
        prompt: 'Chill lofi beats',
        modelVersion: 'auto',
        isBGM: true
      };
      
      expect(() => validateGenerationParams(params)).not.toThrow();
    });

    it('should reject invalid Suno model', () => {
      const params = {
        provider: 'suno',
        prompt: 'Test',
        modelVersion: 'mureka-o1' // Mureka model for Suno!
      };
      
      expect(() => validateGenerationParams(params)).toThrow();
    });

    it('should reject invalid Mureka model', () => {
      const params = {
        provider: 'mureka',
        prompt: 'Test',
        modelVersion: 'V5' // Suno model for Mureka!
      };
      
      expect(() => validateGenerationParams(params)).toThrow();
    });

    it('should reject Suno-only features for Mureka', () => {
      const params = {
        provider: 'mureka',
        prompt: 'Test',
        customMode: true // Suno-only feature
      };
      
      expect(() => validateGenerationParams(params)).toThrow(/Custom mode is not supported by Mureka/);
    });

    it('should reject vocal gender for Mureka', () => {
      const params = {
        provider: 'mureka',
        prompt: 'Test',
        vocalGender: 'f' as const
      };
      
      expect(() => validateGenerationParams(params)).toThrow(/Vocal gender selection is not supported by Mureka/);
    });

    it('should require model version for Suno custom mode', () => {
      const params = {
        provider: 'suno',
        prompt: 'Test',
        customMode: true
        // modelVersion отсутствует!
      };
      
      expect(() => validateGenerationParams(params)).toThrow(/Model version is required when using custom mode/);
    });

    it('should validate prompt length', () => {
      const params = {
        provider: 'suno',
        prompt: 'a'.repeat(3001), // Превышает лимит 3000
        modelVersion: 'V5'
      };
      
      expect(() => validateGenerationParams(params)).toThrow(/Prompt too long/);
    });

    it('should validate lyrics length', () => {
      const params = {
        provider: 'suno',
        prompt: 'Test',
        lyrics: 'x'.repeat(3001) // Превышает лимит 3000
      };
      
      expect(() => validateGenerationParams(params)).toThrow();
    });

    it('should validate style tags count', () => {
      const params = {
        provider: 'suno',
        prompt: 'Test',
        styleTags: Array(21).fill('tag') // Превышает лимит 20
      };
      
      expect(() => validateGenerationParams(params)).toThrow();
    });
  });

  describe('validateExtensionParams', () => {
    it('should validate valid extension params', () => {
      const params = {
        originalTrackId: '123e4567-e89b-12d3-a456-426614174000',
        prompt: 'Continue the epic journey',
        duration: 60
      };
      
      expect(() => validateExtensionParams(params)).not.toThrow();
    });

    it('should reject invalid UUID', () => {
      const params = {
        originalTrackId: 'not-a-uuid',
        prompt: 'Test'
      };
      
      expect(() => validateExtensionParams(params)).toThrow();
    });

    it('should validate duration bounds', () => {
      const paramsTooBig = {
        originalTrackId: '123e4567-e89b-12d3-a456-426614174000',
        prompt: 'Test',
        duration: 300 // Превышает 240
      };
      
      expect(() => validateExtensionParams(paramsTooBig)).toThrow();
    });
  });

  describe('validateStemSeparationParams', () => {
    it('should validate valid separation params', () => {
      const params = {
        trackId: '123e4567-e89b-12d3-a456-426614174000',
        audioId: '123e4567-e89b-12d3-a456-426614174001',
        separationType: 'separate_vocal' as const
      };
      
      expect(() => validateStemSeparationParams(params)).not.toThrow();
    });

    it('should validate split_stem type', () => {
      const params = {
        trackId: '123e4567-e89b-12d3-a456-426614174000',
        audioId: '123e4567-e89b-12d3-a456-426614174001',
        separationType: 'split_stem' as const
      };
      
      expect(() => validateStemSeparationParams(params)).not.toThrow();
    });

    it('should reject invalid separation type', () => {
      const params = {
        trackId: '123e4567-e89b-12d3-a456-426614174000',
        audioId: '123e4567-e89b-12d3-a456-426614174001',
        separationType: 'invalid_type'
      };
      
      expect(() => validateStemSeparationParams(params)).toThrow();
    });
  });

  describe('safeValidateGenerationParams', () => {
    it('should return success for valid params', () => {
      const params = {
        provider: 'suno',
        prompt: 'Test',
        modelVersion: 'V5'
      };
      
      const result = safeValidateGenerationParams(params);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.provider).toBe('suno');
      }
    });

    it('should return error for invalid params', () => {
      const params = {
        provider: 'suno',
        prompt: 'Test',
        modelVersion: 'invalid-model'
      };
      
      const result = safeValidateGenerationParams(params);
      
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Model Utilities', () => {
    describe('isValidModelForProvider', () => {
      it('should validate Suno models', () => {
        expect(isValidModelForProvider('suno', 'V5')).toBe(true);
        expect(isValidModelForProvider('suno', 'V4_5PLUS')).toBe(true);
        expect(isValidModelForProvider('suno', 'V4')).toBe(true);
      });

      it('should validate Mureka models', () => {
        expect(isValidModelForProvider('mureka', 'auto')).toBe(true);
        expect(isValidModelForProvider('mureka', 'mureka-o1')).toBe(true);
        expect(isValidModelForProvider('mureka', 'mureka-7.5')).toBe(true);
      });

      it('should reject invalid models', () => {
        expect(isValidModelForProvider('suno', 'mureka-o1')).toBe(false);
        expect(isValidModelForProvider('mureka', 'V5')).toBe(false);
        expect(isValidModelForProvider('suno', 'invalid')).toBe(false);
      });
    });

    describe('getDefaultModelForProvider', () => {
      it('should return V5 for Suno', () => {
        expect(getDefaultModelForProvider('suno')).toBe('V5');
      });

      it('should return auto for Mureka', () => {
        expect(getDefaultModelForProvider('mureka')).toBe('auto');
      });
    });

    describe('getValidModelsForProvider', () => {
      it('should return Suno models', () => {
        const models = getValidModelsForProvider('suno');
        expect(models).toContain('V5');
        expect(models).toContain('V4_5PLUS');
        expect(models).toContain('V4');
        expect(models).toContain('V3_5');
      });

      it('should return Mureka models', () => {
        const models = getValidModelsForProvider('mureka');
        expect(models).toContain('auto');
        expect(models).toContain('mureka-o1');
        expect(models).toContain('mureka-7.5');
        expect(models).toContain('mureka-6');
      });
    });
  });
});
