/**
 * Unit тесты для useAudioQueue
 * SPRINT 28: PLAYER-TEST-001
 */
import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAudioQueue } from '../useAudioQueue';
import type { AudioPlayerTrack } from '@/types/track.types';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

describe('useAudioQueue', () => {
  const mockTrack1: AudioPlayerTrack = {
    id: 'track-1',
    title: 'Test Track 1',
    audio_url: 'https://example.com/track1.mp3',
    status: 'completed',
  };

  const mockTrack2: AudioPlayerTrack = {
    id: 'track-2',
    title: 'Test Track 2',
    audio_url: 'https://example.com/track2.mp3',
    status: 'completed',
  };

  const mockTrack3: AudioPlayerTrack = {
    id: 'track-3',
    title: 'Test Track 3',
    audio_url: 'https://example.com/track3.mp3',
    status: 'completed',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Queue Management', () => {
    it('should initialize with empty queue', () => {
      const { result } = renderHook(() => useAudioQueue());

      expect(result.current.queue).toEqual([]);
      expect(result.current.currentQueueIndex).toBe(-1);
    });

    it('should add track to queue', () => {
      const { result } = renderHook(() => useAudioQueue());

      act(() => {
        result.current.addToQueue(mockTrack1);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe('track-1');
    });

    it('should not add duplicate tracks', () => {
      const { result } = renderHook(() => useAudioQueue());

      act(() => {
        result.current.addToQueue(mockTrack1);
        result.current.addToQueue(mockTrack1);
      });

      expect(result.current.queue).toHaveLength(1);
    });

    it('should remove track from queue', () => {
      const { result } = renderHook(() => useAudioQueue());

      act(() => {
        result.current.addToQueue(mockTrack1);
        result.current.addToQueue(mockTrack2);
      });

      expect(result.current.queue).toHaveLength(2);

      act(() => {
        result.current.removeFromQueue('track-1');
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe('track-2');
    });

    it('should clear entire queue', () => {
      const { result } = renderHook(() => useAudioQueue());

      act(() => {
        result.current.addToQueue(mockTrack1);
        result.current.addToQueue(mockTrack2);
        result.current.addToQueue(mockTrack3);
      });

      expect(result.current.queue).toHaveLength(3);

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queue).toEqual([]);
      expect(result.current.currentQueueIndex).toBe(-1);
    });

    it('should reorder queue items', () => {
      const { result } = renderHook(() => useAudioQueue());

      act(() => {
        result.current.addToQueue(mockTrack1);
        result.current.addToQueue(mockTrack2);
        result.current.addToQueue(mockTrack3);
      });

      act(() => {
        result.current.reorderQueue(0, 2);
      });

      expect(result.current.queue[0].id).toBe('track-2');
      expect(result.current.queue[1].id).toBe('track-3');
      expect(result.current.queue[2].id).toBe('track-1');
    });
  });

  describe('Navigation', () => {
    it('should play next track in queue', () => {
      const { result } = renderHook(() => useAudioQueue());
      const mockPlayTrack = vi.fn();

      act(() => {
        result.current.addToQueue(mockTrack1);
        result.current.addToQueue(mockTrack2);
        result.current.addToQueue(mockTrack3);
      });

      act(() => {
        result.current.playNext(mockPlayTrack);
      });

      expect(result.current.currentQueueIndex).toBe(0);
      expect(mockPlayTrack).toHaveBeenCalledWith(mockTrack1);

      act(() => {
        result.current.playNext(mockPlayTrack);
      });

      expect(result.current.currentQueueIndex).toBe(1);
      expect(mockPlayTrack).toHaveBeenCalledWith(mockTrack2);
    });

    it('should not play next when at end of queue', () => {
      const { result } = renderHook(() => useAudioQueue());
      const mockPlayTrack = vi.fn();

      act(() => {
        result.current.addToQueue(mockTrack1);
      });

      act(() => {
        result.current.playNext(mockPlayTrack);
        result.current.playNext(mockPlayTrack);
      });

      expect(mockPlayTrack).toHaveBeenCalledTimes(1);
      expect(result.current.currentQueueIndex).toBe(0);
    });

    it('should play previous track in queue', () => {
      const { result } = renderHook(() => useAudioQueue());
      const mockPlayTrack = vi.fn();

      act(() => {
        result.current.addToQueue(mockTrack1);
        result.current.addToQueue(mockTrack2);
        result.current.addToQueue(mockTrack3);
      });

      // Переход к track-3
      act(() => {
        result.current.playNext(mockPlayTrack);
        result.current.playNext(mockPlayTrack);
        result.current.playNext(mockPlayTrack);
      });

      expect(result.current.currentQueueIndex).toBe(2);

      // Назад к track-2
      act(() => {
        result.current.playPrevious(mockPlayTrack);
      });

      expect(result.current.currentQueueIndex).toBe(1);
      expect(mockPlayTrack).toHaveBeenLastCalledWith(mockTrack2);
    });

    it('should not play previous when at start of queue', () => {
      const { result } = renderHook(() => useAudioQueue());
      const mockPlayTrack = vi.fn();

      act(() => {
        result.current.addToQueue(mockTrack1);
      });

      act(() => {
        result.current.playNext(mockPlayTrack);
      });

      const callCount = mockPlayTrack.mock.calls.length;

      act(() => {
        result.current.playPrevious(mockPlayTrack);
      });

      // Не должно быть дополнительных вызовов
      expect(mockPlayTrack).toHaveBeenCalledTimes(callCount);
    });
  });

  describe('Preloading', () => {
    it('should preload next track', () => {
      const { result } = renderHook(() => useAudioQueue());

      act(() => {
        result.current.addToQueue(mockTrack1);
        result.current.addToQueue(mockTrack2);
      });

      act(() => {
        result.current.playNext(vi.fn());
      });

      // Preloading is async, check it doesn't throw
      expect(() => {
        act(() => {
          result.current.playNext(vi.fn());
        });
      }).not.toThrow();
    });
  });
});
