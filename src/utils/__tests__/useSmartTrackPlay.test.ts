/**
 * Unit tests for useSmartTrackPlay hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSmartTrackPlay } from '@/hooks/useSmartTrackPlay';

// Mock dependencies
vi.mock('@/contexts/AudioPlayerContext', () => ({
  useAudioPlayer: () => ({
    playTrack: vi.fn(),
  }),
}));

vi.mock('@/features/tracks', () => ({
  getTrackWithVersions: vi.fn(),
}));

vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
}));

describe('useSmartTrackPlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('selectBestVersion', () => {
    it('should select master version when available', () => {
      const { result } = renderHook(() => useSmartTrackPlay());
      
      const versions = [
        { id: '1', versionNumber: 0, isMasterVersion: false, audio_url: 'audio1.mp3' },
        { id: '2', versionNumber: 1, isMasterVersion: true, audio_url: 'audio2.mp3' },
        { id: '3', versionNumber: 2, isMasterVersion: false, audio_url: 'audio3.mp3' },
      ] as any;

      const selected = result.current.selectBestVersion(versions);
      
      expect(selected?.id).toBe('2');
      expect(selected?.isMasterVersion).toBe(true);
    });

    it('should fallback to original version if no master', () => {
      const { result } = renderHook(() => useSmartTrackPlay());
      
      const versions = [
        { id: '1', versionNumber: 0, isMasterVersion: false, isOriginal: true, audio_url: 'audio1.mp3' },
        { id: '2', versionNumber: 1, isMasterVersion: false, audio_url: 'audio2.mp3' },
      ] as any;

      const selected = result.current.selectBestVersion(versions);
      
      expect(selected?.id).toBe('1');
      expect(selected?.versionNumber).toBe(0);
    });

    it('should fallback to first available version', () => {
      const { result } = renderHook(() => useSmartTrackPlay());
      
      const versions = [
        { id: '1', versionNumber: 1, isMasterVersion: false, audio_url: 'audio1.mp3' },
        { id: '2', versionNumber: 2, isMasterVersion: false, audio_url: 'audio2.mp3' },
      ] as any;

      const selected = result.current.selectBestVersion(versions);
      
      expect(selected?.id).toBe('1');
    });

    it('should return null for empty versions array', () => {
      const { result } = renderHook(() => useSmartTrackPlay());
      
      const selected = result.current.selectBestVersion([]);
      
      expect(selected).toBeNull();
    });
  });
});
