/**
 * Unit tests for useTrackCard hook
 * Tests business logic separation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrackCard } from '@/features/tracks/hooks/useTrackCard';
import type { Track } from '@/types/domain/track.types';
import { useTrackCardState } from '@/features/tracks/components/card/useTrackCardState';

// Mock the dependency hook
vi.mock('@/features/tracks/components/card/useTrackCardState');

describe('useTrackCard', () => {
  beforeEach(() => {
    // Provide a default mock implementation for useTrackCardState
    (useTrackCardState as ReturnType<typeof vi.fn>).mockReturnValue({
      isHovered: false,
      isVisible: true,
      hasStems: false,
      selectedVersionIndex: 0,
      isLiked: false,
      likeCount: 0,
      versionCount: 1,
      masterVersion: null,
      displayedVersion: {},
      operationTargetId: '1',
      operationTargetVersion: {},
      isCurrentTrack: false,
      isPlaying: false,
      playButtonDisabled: false,
    });
  });
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
    audio_url: null,
    cover_url: null,
    video_url: null,
    style_tags: null,
    lyrics: null,
    duration: null,
    duration_seconds: null,
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

  it('should initialize with correct state', () => {
    const callbacks = {
      onShare: vi.fn(),
      onClick: vi.fn(),
    };

    const { result } = renderHook(() => useTrackCard(mockTrack, callbacks));

    expect(result.current.handleShareClick).toBeDefined();
    expect(result.current.handleCardClick).toBeDefined();
    expect(result.current.handleKeyDown).toBeDefined();
  });

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

    // Test Enter key
    const enterEvent = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.handleKeyDown(enterEvent);

    expect(callbacks.onClick).toHaveBeenCalledTimes(1);
    expect(enterEvent.preventDefault).toHaveBeenCalled();

    // Test Space key
    const spaceEvent = {
      key: ' ',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.handleKeyDown(spaceEvent);

    expect(callbacks.onClick).toHaveBeenCalledTimes(2);
    expect(spaceEvent.preventDefault).toHaveBeenCalled();
  });

  it('should not call onClick for other keys', () => {
    const callbacks = {
      onClick: vi.fn(),
    };

    const { result } = renderHook(() => useTrackCard(mockTrack, callbacks));

    const tabEvent = {
      key: 'Tab',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    result.current.handleKeyDown(tabEvent);

    expect(callbacks.onClick).not.toHaveBeenCalled();
    expect(tabEvent.preventDefault).not.toHaveBeenCalled();
  });

  it('should not throw when onClick is not provided', () => {
    const { result } = renderHook(() => useTrackCard(mockTrack, {}));

    // Test Enter key
    const enterEvent = {
      key: 'Enter',
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent;

    expect(() => result.current.handleKeyDown(enterEvent)).not.toThrow();
    expect(() => result.current.handleCardClick()).not.toThrow();
  });
});
