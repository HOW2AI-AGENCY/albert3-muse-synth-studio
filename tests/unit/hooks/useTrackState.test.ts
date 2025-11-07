/**
 * useTrackState Hook Tests
 *
 * Tests for the shared track state management hook
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTrackState } from '@/hooks/useTrackState';
import type { Track } from '@/types/domain/track.types';

// Mock dependencies
vi.mock('@/stores/audioPlayerStore', () => ({
  useCurrentTrack: vi.fn(() => null),
  useIsPlaying: vi.fn(() => false),
  useAudioPlayerStore: vi.fn(() => ({
    playTrack: vi.fn(),
    switchToVersion: vi.fn(),
  })),
}));

vi.mock('@/features/tracks/hooks', () => ({
  useTrackVersions: vi.fn(() => ({
    versions: [],
    mainVersion: null,
    versionCount: 0,
    masterVersion: null,
  })),
}));

vi.mock('@/features/tracks/hooks/useTrackVersionLike', () => ({
  useTrackVersionLike: vi.fn(() => ({
    isLiked: false,
    likeCount: 0,
    toggleLike: vi.fn(),
  })),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({ data: [] })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('useTrackState', () => {
  const mockTrack: Track = {
    id: 'track-123',
    title: 'Test Track',
    prompt: 'Test prompt',
    status: 'completed',
    audio_url: 'https://example.com/audio.mp3',
    cover_url: 'https://example.com/cover.jpg',
    duration: 180,
    created_at: '2025-11-07T00:00:00Z',
    user_id: 'user-123',
    is_public: false,
    has_vocals: true,
    style_tags: ['rock', 'indie'],
    metadata: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization', () => {
    it('initializes with default state', () => {
      const { result } = renderHook(() => useTrackState(mockTrack));

      expect(result.current.selectedVersionIndex).toBe(0);
      expect(result.current.isHovered).toBe(false);
      expect(result.current.isVisible).toBe(false);
      expect(result.current.hasStems).toBe(false);
    });

    it('loads selectedVersionIndex from localStorage if available', () => {
      localStorage.setItem('track:selectedVersion:track-123', '2');

      const { result } = renderHook(() => useTrackState(mockTrack));

      expect(result.current.selectedVersionIndex).toBe(2);
    });

    it('uses default index 0 if localStorage has invalid data', () => {
      localStorage.setItem('track:selectedVersion:track-123', 'invalid');

      const { result } = renderHook(() => useTrackState(mockTrack));

      expect(result.current.selectedVersionIndex).toBe(0);
    });
  });

  describe('Version Management', () => {
    it('provides displayedVersion based on selectedVersionIndex', () => {
      const { result } = renderHook(() => useTrackState(mockTrack));

      expect(result.current.displayedVersion).toBeDefined();
      expect(result.current.displayedVersion.id).toBe(mockTrack.id);
      expect(result.current.displayedVersion.title).toBe(mockTrack.title);
    });

    it('updates operationTargetId to match displayedVersion', () => {
      const { result } = renderHook(() => useTrackState(mockTrack));

      expect(result.current.operationTargetId).toBe(result.current.displayedVersion.id);
    });

    it('saves selectedVersionIndex to localStorage when changed', async () => {
      const { result } = renderHook(() => useTrackState(mockTrack));

      act(() => {
        result.current.handleVersionChange(1);
      });

      await waitFor(() => {
        const stored = localStorage.getItem('track:selectedVersion:track-123');
        expect(stored).toBe('1');
      });
    });
  });

  describe('Player State', () => {
    it('sets isCurrentTrack to false when track is not playing', () => {
      const { result } = renderHook(() => useTrackState(mockTrack));

      expect(result.current.isCurrentTrack).toBe(false);
      expect(result.current.isPlaying).toBe(false);
    });

    it('sets playButtonDisabled to false for completed track with audio_url', () => {
      const { result } = renderHook(() => useTrackState(mockTrack));

      expect(result.current.playButtonDisabled).toBe(false);
    });

    it('sets playButtonDisabled to true for processing track', () => {
      const processingTrack = { ...mockTrack, status: 'processing' as const };
      const { result } = renderHook(() => useTrackState(processingTrack));

      expect(result.current.playButtonDisabled).toBe(true);
    });

    it('sets playButtonDisabled to true for track without audio_url', () => {
      const noAudioTrack = { ...mockTrack, audio_url: null };
      const { result } = renderHook(() => useTrackState(noAudioTrack));

      expect(result.current.playButtonDisabled).toBe(true);
    });
  });

  describe('Handlers', () => {
    describe('handlePlayClick', () => {
      it('calls playTrack with correct parameters', () => {
        const mockPlayTrack = vi.fn();
        const { useAudioPlayerStore } = require('@/stores/audioPlayerStore');
        useAudioPlayerStore.mockReturnValue({
          playTrack: mockPlayTrack,
          switchToVersion: vi.fn(),
        });

        const { result } = renderHook(() => useTrackState(mockTrack));

        act(() => {
          result.current.handlePlayClick();
        });

        expect(mockPlayTrack).toHaveBeenCalledWith(
          expect.objectContaining({
            id: mockTrack.id,
            title: mockTrack.title,
            audio_url: mockTrack.audio_url,
            status: 'completed',
          })
        );
      });

      it('does not call playTrack when playButtonDisabled is true', () => {
        const mockPlayTrack = vi.fn();
        const { useAudioPlayerStore } = require('@/stores/audioPlayerStore');
        useAudioPlayerStore.mockReturnValue({
          playTrack: mockPlayTrack,
          switchToVersion: vi.fn(),
        });

        const processingTrack = { ...mockTrack, status: 'processing' as const };
        const { result } = renderHook(() => useTrackState(processingTrack));

        act(() => {
          result.current.handlePlayClick();
        });

        expect(mockPlayTrack).not.toHaveBeenCalled();
      });
    });

    describe('handleLikeClick', () => {
      it('calls toggleLike when clicked', () => {
        const mockToggleLike = vi.fn();
        const { useTrackVersionLike } = require('@/features/tracks/hooks/useTrackVersionLike');
        useTrackVersionLike.mockReturnValue({
          isLiked: false,
          likeCount: 0,
          toggleLike: mockToggleLike,
        });

        const { result } = renderHook(() => useTrackState(mockTrack));

        act(() => {
          result.current.handleLikeClick();
        });

        expect(mockToggleLike).toHaveBeenCalledTimes(1);
      });
    });

    describe('handleDownloadClick', () => {
      it('creates download link and triggers download', () => {
        const mockToast = vi.fn();
        const { useToast } = require('@/hooks/use-toast');
        useToast.mockReturnValue({ toast: mockToast });

        // Mock DOM APIs
        const mockLink = {
          href: '',
          download: '',
          click: vi.fn(),
        };
        const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
        const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
        const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);

        const { result } = renderHook(() => useTrackState(mockTrack));

        act(() => {
          result.current.handleDownloadClick();
        });

        expect(createElementSpy).toHaveBeenCalledWith('a');
        expect(mockLink.href).toBe(mockTrack.audio_url);
        expect(mockLink.download).toContain(mockTrack.title);
        expect(mockLink.click).toHaveBeenCalled();
        expect(appendChildSpy).toHaveBeenCalled();
        expect(removeChildSpy).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Скачивание начато',
          })
        );

        // Cleanup
        createElementSpy.mockRestore();
        appendChildSpy.mockRestore();
        removeChildSpy.mockRestore();
      });

      it('shows error toast when audio_url is missing', () => {
        const mockToast = vi.fn();
        const { useToast } = require('@/hooks/use-toast');
        useToast.mockReturnValue({ toast: mockToast });

        const noAudioTrack = { ...mockTrack, audio_url: null };
        const { result } = renderHook(() => useTrackState(noAudioTrack));

        act(() => {
          result.current.handleDownloadClick();
        });

        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Ошибка',
            description: 'Аудиофайл недоступен',
            variant: 'destructive',
          })
        );
      });
    });

    describe('handleShareClick', () => {
      it('uses navigator.share when available', async () => {
        const mockShare = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', {
          value: mockShare,
          writable: true,
          configurable: true,
        });

        const { result } = renderHook(() => useTrackState(mockTrack));

        await act(async () => {
          result.current.handleShareClick();
        });

        expect(mockShare).toHaveBeenCalledWith(
          expect.objectContaining({
            title: mockTrack.title,
          })
        );
      });

      it('falls back to clipboard when navigator.share is not available', async () => {
        const mockToast = vi.fn();
        const { useToast } = require('@/hooks/use-toast');
        useToast.mockReturnValue({ toast: mockToast });

        const mockWriteText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'share', {
          value: undefined,
          writable: true,
          configurable: true,
        });
        Object.defineProperty(navigator, 'clipboard', {
          value: { writeText: mockWriteText },
          writable: true,
          configurable: true,
        });

        const { result } = renderHook(() => useTrackState(mockTrack));

        await act(async () => {
          result.current.handleShareClick();
        });

        expect(mockWriteText).toHaveBeenCalled();
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Ссылка скопирована',
          })
        );
      });
    });
  });

  describe('State Setters', () => {
    it('allows setting isHovered', () => {
      const { result } = renderHook(() => useTrackState(mockTrack));

      act(() => {
        result.current.setIsHovered(true);
      });

      expect(result.current.isHovered).toBe(true);
    });

    it('allows setting isVisible', () => {
      const { result } = renderHook(() => useTrackState(mockTrack));

      act(() => {
        result.current.setIsVisible(true);
      });

      expect(result.current.isVisible).toBe(true);
    });
  });

  describe('Like State', () => {
    it('provides isLiked from useTrackVersionLike', () => {
      const { useTrackVersionLike } = require('@/features/tracks/hooks/useTrackVersionLike');
      useTrackVersionLike.mockReturnValue({
        isLiked: true,
        likeCount: 5,
        toggleLike: vi.fn(),
      });

      const { result } = renderHook(() => useTrackState(mockTrack));

      expect(result.current.isLiked).toBe(true);
      expect(result.current.likeCount).toBe(5);
    });
  });
});
