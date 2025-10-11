/**
 * Unit tests for versionLabels utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getVersionLabel,
  getVersionShortLabel,
  getVersionDescription,
  isOriginalVersion,
} from '../versionLabels';

describe('versionLabels', () => {
  describe('getVersionLabel', () => {
    it('should return "Оригинал" for version 0', () => {
      expect(getVersionLabel({ versionNumber: 0 })).toBe('Оригинал');
    });

    it('should return "Оригинал" when isOriginal is true', () => {
      expect(getVersionLabel({ versionNumber: 1, isOriginal: true })).toBe('Оригинал');
    });

    it('should return "⭐ Оригинал" for master original', () => {
      expect(getVersionLabel({ versionNumber: 0, isMaster: true })).toBe('⭐ Оригинал');
    });

    it('should return "Вариант 1" for version 1', () => {
      expect(getVersionLabel({ versionNumber: 1 })).toBe('Вариант 1');
    });

    it('should return "⭐ Вариант 2" for master version 2', () => {
      expect(getVersionLabel({ versionNumber: 2, isMaster: true })).toBe('⭐ Вариант 2');
    });
  });

  describe('getVersionShortLabel', () => {
    it('should return "Ориг" for original', () => {
      expect(getVersionShortLabel({ versionNumber: 0 })).toBe('Ориг');
    });

    it('should return "⭐Ориг" for master original', () => {
      expect(getVersionShortLabel({ versionNumber: 0, isMaster: true })).toBe('⭐Ориг');
    });

    it('should return "V1" for version 1', () => {
      expect(getVersionShortLabel({ versionNumber: 1 })).toBe('V1');
    });

    it('should return "⭐V3" for master version 3', () => {
      expect(getVersionShortLabel({ versionNumber: 3, isMaster: true })).toBe('⭐V3');
    });
  });

  describe('getVersionDescription', () => {
    it('should include "(активная мастер-версия)" for master versions', () => {
      expect(getVersionDescription({ versionNumber: 1, isMaster: true })).toContain('активная мастер-версия');
    });

    it('should return base label for non-master versions', () => {
      expect(getVersionDescription({ versionNumber: 2 })).toBe('Вариант 2');
    });
  });

  describe('isOriginalVersion', () => {
    it('should return true for version 0', () => {
      expect(isOriginalVersion(0, false)).toBe(true);
    });

    it('should return true when isOriginal is true', () => {
      expect(isOriginalVersion(5, true)).toBe(true);
    });

    it('should return false for non-original versions', () => {
      expect(isOriginalVersion(1, false)).toBe(false);
    });

    it('should return false when undefined', () => {
      expect(isOriginalVersion(undefined, undefined)).toBe(false);
    });
  });
});
