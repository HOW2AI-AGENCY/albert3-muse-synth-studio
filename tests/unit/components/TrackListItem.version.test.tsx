import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('@/hooks/useTrackState', () => {
  const handleVersionChange = vi.fn();
  return {
    useTrackState: () => ({
      displayedVersion: { id: 'v1', versionNumber: 1, duration: 123, cover_url: 'https://example.com/c.jpg' },
      isPlaying: false,
      isCurrentTrack: false,
      playButtonDisabled: false,
      selectedVersionIndex: 0,
      uiVersionCount: 2,
      allVersions: [
        { id: 'v1', versionNumber: 1, audio_url: 'a1.mp3' },
        { id: 'v2', versionNumber: 2, audio_url: 'a2.mp3' },
      ],
      operationTargetId: 'v1',
      handleVersionChange,
      handlePlayClick: vi.fn(),
      isLiked: false,
      toggleLike: vi.fn(),
    }),
  };
});

import { TrackListItem } from '../../../src/features/tracks/components/TrackListItem';
import { useIsMobile } from '@/hooks/use-mobile';

vi.mock('@/hooks/use-mobile');

const mockTrack = {
  id: 't1',
  title: 'Demo Track',
  audio_url: 'a1.mp3',
  cover_url: 'https://example.com/c.jpg',
  duration: 123,
  status: 'completed',
  style_tags: ['ambient'],
};

describe('TrackListItem version switching', () => {
  const handleVersionChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useIsMobile as vi.Mock).mockReturnValue(true);
    vi.mock('@/hooks/useTrackState', () => ({
      useTrackState: () => ({
        displayedVersion: { id: 'v1', versionNumber: 1, duration: 123, cover_url: 'https://example.com/c.jpg' },
        isPlaying: false,
        isCurrentTrack: false,
        playButtonDisabled: false,
        selectedVersionIndex: 0,
        uiVersionCount: 2,
        allVersions: [
          { id: 'v1', versionNumber: 1, audio_url: 'a1.mp3' },
          { id: 'v2', versionNumber: 2, audio_url: 'a2.mp3' },
        ],
        operationTargetId: 'v1',
        handleVersionChange,
        handlePlayClick: vi.fn(),
        isLiked: false,
        toggleLike: vi.fn(),
      }),
    }));
  });

  it('allows switching versions via the mobile actions menu', async () => {
    render(<TrackListItem track={mockTrack as any} />);

    // Open the actions menu
    const menuTrigger = screen.getByRole('button', { name: /Track actions menu/i });
    fireEvent.click(menuTrigger);

    // Find the version switcher button inside the menu/drawer
    // Note: The actual implementation might render buttons or other elements.
    // We'll look for something that indicates it's a version item.
    // Let's assume the version switcher renders items with text like "Version X"
    const version2Button = await screen.findByText(/Version 2/i);
    expect(version2Button).toBeTruthy();

    // Click to switch to version 2
    fireEvent.click(version2Button);

    // Assert that the change handler was called with the correct version index
    expect(handleVersionChange).toHaveBeenCalledWith(1); // Index for v2
  });
});