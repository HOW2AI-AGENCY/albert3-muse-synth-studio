/**
 * Unit tests for useTrackCard hook
 * Tests business logic separation
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrackCard } from '@/features/tracks/hooks/useTrackCard';
import type { Track } from '@/types/domain/track.types';

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
});
