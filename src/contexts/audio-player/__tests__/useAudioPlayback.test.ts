/**
 * Unit тесты для useAudioPlayback
 * SPRINT 28: PLAYER-TEST-001
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAudioPlayback, hasKnownAudioExtension } from '../useAudioPlayback';
import type { AudioPlayerTrack } from '@/types/track';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/utils/serviceWorker', () => ({
  cacheAudioFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

// Mock HTMLAudioElement
class MockAudioElement {
  src = '';
  currentTime = 0;
  volume = 1;
  readyState = 0;
  networkState = 0;
  paused = true;
  crossOrigin: string | null = null;
  
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  load = vi.fn(() => {
    this.readyState = 4; // HAVE_ENOUGH_DATA
    this.dispatchEvent('canplay');
  });
  play = vi.fn(() => {
    this.paused = false;
    this.dispatchEvent('play');
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
    this.dispatchEvent('pause');
  });
  dispatchEvent = vi.fn();
  removeAttribute = vi.fn();
}

// @ts-ignore
global.HTMLAudioElement = MockAudioElement;

describe('useAudioPlayback', () => {
  const mockTrack: AudioPlayerTrack = {
    id: 'track-1',
    title: 'Test Track',
    audio_url: 'https://cdn1.suno.ai/test.mp3',
    status: 'completed',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasKnownAudioExtension', () => {
    it('should accept trusted domains', () => {
      expect(hasKnownAudioExtension('https://cdn1.suno.ai/track.mp3')).toBe(true);
      expect(hasKnownAudioExtension('https://cdn2.suno.ai/track')).toBe(true);
      expect(hasKnownAudioExtension('https://supabase.co/storage/track')).toBe(true);
    });

    it('should validate audio extensions for unknown domains', () => {
      expect(hasKnownAudioExtension('https://unknown.com/track.mp3')).toBe(true);
      expect(hasKnownAudioExtension('https://unknown.com/track.wav')).toBe(true);
      expect(hasKnownAudioExtension('https://unknown.com/track.txt')).toBe(false);
    });

    it('should handle URLs with query parameters', () => {
      expect(hasKnownAudioExtension('https://cdn1.suno.ai/track?token=abc')).toBe(true);
      expect(hasKnownAudioExtension('https://unknown.com/track.mp3?v=1')).toBe(true);
    });
  });

  describe('Playback State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useAudioPlayback());

      expect(result.current.currentTrack).toBeNull();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
      expect(result.current.duration).toBe(0);
      expect(result.current.volume).toBe(1);
    });

    it('should update volume', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.setVolume(0.5);
      });

      expect(result.current.volume).toBe(0.5);
    });

    it('should clamp volume between 0 and 1', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.setVolume(1.5);
      });
      expect(result.current.volume).toBe(1);

      act(() => {
        result.current.setVolume(-0.5);
      });
      expect(result.current.volume).toBe(0);
    });
  });

  describe('Track Playback', () => {
    it('should validate audio URL before playing', async () => {
      const { result } = renderHook(() => useAudioPlayback());
      const invalidTrack = { ...mockTrack, audio_url: '' };

      await act(async () => {
        await result.current.playTrack(invalidTrack);
      });

      expect(result.current.currentTrack).toBeNull();
    });

    it('should validate audio extension', async () => {
      const { result } = renderHook(() => useAudioPlayback());
      const invalidTrack = { 
        ...mockTrack, 
        audio_url: 'https://unknown.com/file.txt' 
      };

      await act(async () => {
        await result.current.playTrack(invalidTrack);
      });

      expect(result.current.currentTrack).toBeNull();
    });

    it('should clear current track', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.clearCurrentTrack();
      });

      expect(result.current.currentTrack).toBeNull();
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.currentTime).toBe(0);
    });
  });

  describe('Playback Controls', () => {
    it('should pause playback', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.pauseTrack();
      });

      expect(result.current.isPlaying).toBe(false);
    });

    it('should seek to specific time', () => {
      const { result } = renderHook(() => useAudioPlayback());

      act(() => {
        result.current.seekTo(30);
      });

      expect(result.current.currentTime).toBe(30);
    });
  });

  describe('Audio Extension Validation', () => {
    it('should correctly identify known audio extensions', () => {
      const { result } = renderHook(() => useAudioPlayback());

      expect(result.current.isKnownAudioExtension('track.mp3')).toBe(true);
      expect(result.current.isKnownAudioExtension('track.wav')).toBe(true);
      expect(result.current.isKnownAudioExtension('track.ogg')).toBe(true);
      expect(result.current.isKnownAudioExtension('track.txt')).toBe(false);
    });
  });
});
