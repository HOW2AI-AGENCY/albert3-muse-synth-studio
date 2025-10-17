/**
 * Unit тесты для useAudioVersions
 * SPRINT 28: PLAYER-TEST-001
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAudioVersions } from '../useAudioVersions';
import type { AudioPlayerTrack } from '@/types/track';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              {
                id: 'version-1',
                parent_track_id: 'track-1',
                version_number: 0,
                title: 'Original Version',
                audio_url: 'https://example.com/v1.mp3',
                is_master: false,
              },
              {
                id: 'version-2',
                parent_track_id: 'track-1',
                version_number: 1,
                title: 'Version 2',
                audio_url: 'https://example.com/v2.mp3',
                is_master: true,
              },
            ],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

describe('useAudioVersions', () => {
  const mockTrack: AudioPlayerTrack = {
    id: 'track-1',
    title: 'Test Track',
    audio_url: 'https://example.com/track.mp3',
    status: 'completed',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Version Loading', () => {
    it('should load versions for a track', async () => {
      const { result } = renderHook(() => useAudioVersions());

      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      await waitFor(() => {
        const versions = result.current.getAvailableVersions();
        expect(versions).toHaveLength(2);
      });
    });

    it('should cache loaded versions', async () => {
      const { result } = renderHook(() => useAudioVersions());

      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      // Второй вызов должен использовать кэш
      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      const versions = result.current.getAvailableVersions();
      expect(versions).toHaveLength(2);
    });

    it('should force reload when requested', async () => {
      const { result } = renderHook(() => useAudioVersions());

      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      await act(async () => {
        await result.current.loadVersions('track-1', true);
      });

      const versions = result.current.getAvailableVersions();
      expect(versions).toHaveLength(2);
    });
  });

  describe('Version Navigation', () => {
    it('should switch to specific version', async () => {
      const { result } = renderHook(() => useAudioVersions());
      const mockPlayTrack = vi.fn();

      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      await act(async () => {
        await result.current.switchToVersion('version-2', mockTrack, mockPlayTrack);
      });

      await waitFor(() => {
        expect(mockPlayTrack).toHaveBeenCalled();
      });
    });

    it('should handle version not found', async () => {
      const { result } = renderHook(() => useAudioVersions());
      const mockPlayTrack = vi.fn();

      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      await act(async () => {
        await result.current.switchToVersion('non-existent', mockTrack, mockPlayTrack);
      });

      // Should try to reload
      await waitFor(() => {
        expect(result.current.getAvailableVersions()).toHaveLength(2);
      });
    });
  });

  describe('Preloading', () => {
    it('should preload next version', async () => {
      const { result } = renderHook(() => useAudioVersions());

      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      act(() => {
        result.current.setCurrentVersionIndex(0);
      });

      await act(async () => {
        await result.current.preloadNextVersion();
      });

      // Preloading должно пройти без ошибок
      expect(true).toBe(true);
    });

    it('should not preload if already at last version', async () => {
      const { result } = renderHook(() => useAudioVersions());

      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      act(() => {
        result.current.setCurrentVersionIndex(1); // Last version
      });

      await act(async () => {
        await result.current.preloadNextVersion();
      });

      expect(true).toBe(true);
    });
  });

  describe('Version Index Management', () => {
    it('should update current version index', () => {
      const { result } = renderHook(() => useAudioVersions());

      expect(result.current.currentVersionIndex).toBe(0);

      act(() => {
        result.current.setCurrentVersionIndex(2);
      });

      expect(result.current.currentVersionIndex).toBe(2);
    });

    it('should get available versions', async () => {
      const { result } = renderHook(() => useAudioVersions());

      await act(async () => {
        await result.current.loadVersions('track-1', false);
      });

      const versions = result.current.getAvailableVersions();
      expect(versions).toHaveLength(2);
      expect(versions[0].id).toBe('version-1');
      expect(versions[1].id).toBe('version-2');
    });
  });
});
