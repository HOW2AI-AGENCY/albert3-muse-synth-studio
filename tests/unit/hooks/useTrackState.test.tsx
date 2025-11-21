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
import * as AudioPlayerStore from '@/stores/audioPlayerStore';
import { useTrackVersionLike } from '@/features/tracks/hooks/useTrackVersionLike';
import { useToast } from '@/hooks/use-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock dependencies
vi.mock('@/stores/audioPlayerStore');
vi.mock('@/features/tracks/hooks', async () => ({
  useTrackVariants: vi.fn(),
}));
vi.mock('@/features/tracks/hooks/useTrackVersionLike');
vi.mock('@/hooks/use-toast');
vi.mock('@/integrations/supabase/client');
vi.mock('@/utils/logger');

const queryClient = new QueryClient();
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

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

  const mockVariantsData = {
    mainTrack: { id: 'track-123', title: 'Test Track', audioUrl: 'audio.mp3' },
    variants: [{ id: 'variant-1', title: 'Test Track', audioUrl: 'variant.mp3', isPreferredVariant: false }],
    preferredVariant: null,
  };

  beforeEach(async () => {
    const mod = await import('@/features/tracks/hooks');
    vi.clearAllMocks();
    localStorage.clear();
    mod.useTrackVariants.mockReturnValue({ data: mockVariantsData, isLoading: false });
    vi.mocked(AudioPlayerStore.useAudioPlayerStore).mockReturnValue({
        playTrack: vi.fn(),
        switchToVersion: vi.fn(),
    });
    vi.mocked(useTrackVersionLike).mockReturnValue({
        isLiked: false,
        likeCount: 0,
        toggleLike: vi.fn(),
    });
    vi.mocked(useToast).mockReturnValue({ toast: vi.fn() });
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('initializes and loads selectedVersionIndex from localStorage', () => {
    localStorage.setItem('track:selectedVersion:track-123', '1');
    const { result } = renderHook(() => useTrackState(mockTrack), { wrapper });
    expect(result.current.selectedVersionIndex).toBe(1);
  });

  it('provides displayedVersion based on selectedVersionIndex', () => {
    const { result } = renderHook(() => useTrackState(mockTrack), { wrapper });
    expect(result.current.displayedVersion).toBeDefined();
    expect(result.current.displayedVersion.id).toBe('track-123');
  });

  it('calls playTrack with correct parameters', () => {
    const mockPlayTrack = vi.fn();
    vi.mocked(AudioPlayerStore.useAudioPlayerStore).mockReturnValue({
        playTrack: mockPlayTrack,
        switchToVersion: vi.fn(),
    });

    const { result } = renderHook(() => useTrackState(mockTrack), { wrapper });
    act(() => {
      result.current.handlePlayClick();
    });

    expect(mockPlayTrack).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'track-123',
        title: 'Test Track',
      })
    );
  });

  it('calls toggleLike when handleLikeClick is called', () => {
    const mockToggleLike = vi.fn();
    vi.mocked(useTrackVersionLike).mockReturnValue({
        isLiked: false,
        likeCount: 0,
        toggleLike: mockToggleLike,
    });
    const { result } = renderHook(() => useTrackState(mockTrack), { wrapper });
    act(() => {
        result.current.handleLikeClick();
    });
    expect(mockToggleLike).toHaveBeenCalledTimes(1);
  });
});
