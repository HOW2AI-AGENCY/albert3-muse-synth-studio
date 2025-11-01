/**
 * Unit tests for versionLabels utilities
 */

import { describe, it, expect } from 'vitest';
import {
  getVersionLabel,
  getVersionShortLabel,
  getVersionDescription,
} from '../versionLabels';

describe('versionLabels', () => {
  describe('getVersionLabel', () => {
    it('should return "V1" for version 1', () => {
      expect(getVersionLabel({ versionNumber: 1 })).toBe('V1');
    });

    it('should return "V2" for version 2', () => {
      expect(getVersionLabel({ versionNumber: 2 })).toBe('V2');
    });

    it('should not include master indicator in label', () => {
      const label = getVersionLabel({ versionNumber: 1, isMaster: true });
      expect(label).toBe('V1');
    });
  });

  describe('getVersionShortLabel', () => {
    it('should return "V1" for version 1', () => {
      expect(getVersionShortLabel({ versionNumber: 1 })).toBe('V1');
    });

    it('should return "V3" for version 3', () => {
      expect(getVersionShortLabel({ versionNumber: 3 })).toBe('V3');
    });
  });

  describe('getVersionDescription', () => {
    it('should include "(мастер-версия)" for master versions', () => {
      expect(getVersionDescription({ versionNumber: 1, isMaster: true })).toContain('мастер-версия');
    });

    it('should return base label for non-master versions', () => {
      expect(getVersionDescription({ versionNumber: 2 })).toBe('V2');
    });
  });
});
