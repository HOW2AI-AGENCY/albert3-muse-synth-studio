/**
 * Unit tests for useTrackCard hook
 * Tests business logic separation
 */

import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrackCard } from '@/features/tracks/hooks/useTrackCard';
import type { Track } from '@/types/domain/track.types';

vi.mock('@/stores/audioPlayerStore', () => ({
  useCurrentTrack: vi.fn(),
  useIsPlaying: vi.fn(),
  useAudioPlayerStore: vi.fn(() => ({
    playTrack: vi.fn(),
    switchToVersion: vi.fn(),
  })),
}));

vi.mock('@/features/tracks/hooks', () => ({
  useTrackVariants: vi.fn(() => ({ data: null })),
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

describe('useTrackCard', () => {
  const mockTrack: Track = {
    id: '1',
    title: 'Test Track',
    prompt: 'Test prompt',
    user_id: 'user1',
    status: 'completed',
    provider: 'suno',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
    improved_prompt: null,
    audio_url: 'test_audio.mp3',
    cover_url: null,
    video_url: null,
    style_tags: null,
    lyrics: null,
    duration: 180,
    duration_seconds: 180,
    error_message: null,
    genre: null,
    mood: null,
    has_vocals: null,
    has_stems: null,
    is_public: null,
    like_count: null,
    play_count: null,
    download_count: null,
    view_count: null,
    mureka_task_id: null,
    project_id: null,
    suno_id: null,
    model_name: null,
    created_at_suno: null,
    reference_audio_url: null,
    progress_percent: null,
    idempotency_key: null,
    archived_to_storage: null,
    storage_audio_url: null,
    storage_cover_url: null,
    storage_video_url: null,
    archive_scheduled_at: null,
    archived_at: null,
    metadata: null,
  };

  it('should call onShare callback when handleShareClick is triggered', () => {
    const callbacks = {
      onShare: vi.fn(),
    };

    const { result } = renderHook(() => useTrackCard(mockTrack, callbacks));

    result.current.handleShareClick();

    expect(callbacks.onShare).toHaveBeenCalledTimes(1);
  });

  it('should call onClick callback when handleCardClick is triggered', () => {
    const callbacks = {
      onClick: vi.fn(),
    };

    const { result } = renderHook(() => useTrackCard(mockTrack, callbacks));

    result.current.handleCardClick();

    expect(callbacks.onClick).toHaveBeenCalledTimes(1);
  });

  it('should handle keyboard events (Enter and Space)', () => {
    const callbacks = {
      onClick: vi.fn(),
    };

    const { result } = renderHook(() => useTrackCard(mockTrack, callbacks));

    const enterEvent = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.handleKeyDown(enterEvent);

    expect(callbacks.onClick).toHaveBeenCalledTimes(1);
    expect(enterEvent.preventDefault).toHaveBeenCalled();

    const spaceEvent = {
      key: ' ',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.handleKeyDown(spaceEvent);

    expect(callbacks.onClick).toHaveBeenCalledTimes(2);
    expect(spaceEvent.preventDefault).toHaveBeenCalled();
  });
});
