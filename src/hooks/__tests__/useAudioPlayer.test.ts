import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioPlayer } from '@/contexts/AudioPlayerContext';
import { AudioPlayerProvider } from '@/contexts/audio-player/AudioPlayerProvider';
import type { Track } from '@/types/track';
import type { ReactNode } from 'react';

// ========== MOCKS ==========

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

vi.mock('@/hooks/useMediaSession', () => ({
  useMediaSession: () => ({
    updateMetadata: vi.fn(),
    updatePlaybackState: vi.fn(),
  }),
}));

// ========== HELPERS ==========

const createMockTrack = (overrides: Partial<Track> = {}): Track => ({
  id: 'track-1',
  title: 'Test Track',
  audio_url: 'https://example.com/audio.mp3',
  status: 'completed',
  user_id: 'user-1',
  prompt: 'test prompt',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => (
  <AudioPlayerProvider>{children}</AudioPlayerProvider>
);

// ========== TESTS ==========

describe('useAudioPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('playTrack', () => {
    it('должен воспроизводить трек', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track = createMockTrack();

      act(() => {
        result.current.playTrack(track);
      });

      expect(result.current.currentTrack).toEqual(track);
      expect(result.current.isPlaying).toBe(true);
    });

    it('должен добавлять трек в очередь при playTrackWithQueue', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track1 = createMockTrack({ id: 'track-1' });
      const track2 = createMockTrack({ id: 'track-2' });
      const queue = [track1, track2];

      act(() => {
        result.current.playTrackWithQueue(track1, queue, 0);
      });

      expect(result.current.currentTrack).toEqual(track1);
      expect(result.current.queue).toEqual(queue);
      expect(result.current.currentQueueIndex).toBe(0);
    });
  });

  describe('togglePlayPause', () => {
    it('должен переключать воспроизведение/паузу', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track = createMockTrack();

      act(() => {
        result.current.playTrack(track);
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.togglePlayPause();
      });

      expect(result.current.isPlaying).toBe(false);

      act(() => {
        result.current.togglePlayPause();
      });

      expect(result.current.isPlaying).toBe(true);
    });
  });

  describe('pauseTrack', () => {
    it('должен ставить трек на паузу', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track = createMockTrack();

      act(() => {
        result.current.playTrack(track);
      });

      expect(result.current.isPlaying).toBe(true);

      act(() => {
        result.current.pauseTrack();
      });

      expect(result.current.isPlaying).toBe(false);
    });
  });

  describe('queue management', () => {
    it('должен переходить к следующему треку', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track1 = createMockTrack({ id: 'track-1', title: 'Track 1' });
      const track2 = createMockTrack({ id: 'track-2', title: 'Track 2' });
      const queue = [track1, track2];

      act(() => {
        result.current.playTrackWithQueue(track1, queue, 0);
      });

      expect(result.current.currentTrack?.id).toBe('track-1');

      act(() => {
        result.current.playNext();
      });

      expect(result.current.currentTrack?.id).toBe('track-2');
      expect(result.current.currentQueueIndex).toBe(1);
    });

    it('должен переходить к предыдущему треку', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track1 = createMockTrack({ id: 'track-1', title: 'Track 1' });
      const track2 = createMockTrack({ id: 'track-2', title: 'Track 2' });
      const queue = [track1, track2];

      act(() => {
        result.current.playTrackWithQueue(track2, queue, 1);
      });

      expect(result.current.currentTrack?.id).toBe('track-2');

      act(() => {
        result.current.playPrevious();
      });

      expect(result.current.currentTrack?.id).toBe('track-1');
      expect(result.current.currentQueueIndex).toBe(0);
    });

    it('должен добавлять трек в очередь', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track1 = createMockTrack({ id: 'track-1' });
      const track2 = createMockTrack({ id: 'track-2' });

      act(() => {
        result.current.playTrack(track1);
      });

      act(() => {
        result.current.addToQueue(track2);
      });

      expect(result.current.queue).toContain(track2);
    });

    it('должен удалять трек из очереди', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track1 = createMockTrack({ id: 'track-1' });
      const track2 = createMockTrack({ id: 'track-2' });
      const queue = [track1, track2];

      act(() => {
        result.current.playTrackWithQueue(track1, queue, 0);
      });

      act(() => {
        result.current.removeFromQueue(1);
      });

      expect(result.current.queue).toHaveLength(1);
      expect(result.current.queue[0].id).toBe('track-1');
    });

    it('должен очищать очередь', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track1 = createMockTrack({ id: 'track-1' });
      const track2 = createMockTrack({ id: 'track-2' });
      const queue = [track1, track2];

      act(() => {
        result.current.playTrackWithQueue(track1, queue, 0);
      });

      expect(result.current.queue).toHaveLength(2);

      act(() => {
        result.current.clearQueue();
      });

      expect(result.current.queue).toHaveLength(0);
    });

    it('должен изменять порядок треков в очереди', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track1 = createMockTrack({ id: 'track-1' });
      const track2 = createMockTrack({ id: 'track-2' });
      const queue = [track1, track2];

      act(() => {
        result.current.playTrackWithQueue(track1, queue, 0);
      });

      act(() => {
        result.current.reorderQueue([track2, track1]);
      });

      expect(result.current.queue[0].id).toBe('track-2');
      expect(result.current.queue[1].id).toBe('track-1');
    });
  });

  describe('volume control', () => {
    it('должен изменять громкость', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });

      expect(result.current.volume).toBe(1);

      act(() => {
        result.current.setVolume(0.5);
      });

      expect(result.current.volume).toBe(0.5);
    });

    it('должен ограничивать громкость диапазоном 0-1', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });

      act(() => {
        result.current.setVolume(1.5);
      });

      expect(result.current.volume).toBeLessThanOrEqual(1);

      act(() => {
        result.current.setVolume(-0.5);
      });

      expect(result.current.volume).toBeGreaterThanOrEqual(0);
    });
  });

  describe('seek control', () => {
    it('должен перематывать трек', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });

      act(() => {
        result.current.seekTo(30);
      });

      expect(result.current.currentTime).toBe(30);
    });
  });

  describe('version switching', () => {
    it('должен переключаться между версиями трека', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const version1 = createMockTrack({ id: 'v1', title: 'Version 1' });
      const version2 = createMockTrack({ id: 'v2', title: 'Version 2' });

      act(() => {
        result.current.playTrack(version1);
      });

      expect(result.current.currentTrack?.id).toBe('v1');

      act(() => {
        result.current.switchToVersion(version2);
      });

      expect(result.current.currentTrack?.id).toBe('v2');
      expect(result.current.isPlaying).toBe(true);
    });

    it('должен возвращать доступные версии', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });

      const versions = result.current.getAvailableVersions();
      expect(Array.isArray(versions)).toBe(true);
    });
  });

  describe('clearCurrentTrack', () => {
    it('должен очищать текущий трек', () => {
      const { result } = renderHook(() => useAudioPlayer(), { wrapper });
      const track = createMockTrack();

      act(() => {
        result.current.playTrack(track);
      });

      expect(result.current.currentTrack).toBeTruthy();

      act(() => {
        result.current.clearCurrentTrack();
      });

      expect(result.current.currentTrack).toBeNull();
      expect(result.current.isPlaying).toBe(false);
    });
  });
});
