import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test-utils'; // Use test-utils for QueryClientProvider
import React from 'react';

vi.mock('@/hooks/useTrackState', () => {
  return {
    useTrackState: () => ({
      isPlaying: false,
      displayedVersion: { id: 'v1', versionNumber: 1, duration: 123, cover_url: 'https://example.com/c.jpg' },
      isLiked: false,
      toggleLike: vi.fn(),
      uiVersionCount: 2,
      handleVersionChange: vi.fn(),
      operationTargetId: 'v1',
      allVersions: [
        { id: 'v1', versionNumber: 1, audio_url: 'a1.mp3', isMasterVersion: false },
        { id: 'v2', versionNumber: 2, audio_url: 'a2.mp3', isMasterVersion: true },
      ],
    }),
  };
});

import { MinimalDetailPanel } from '../../../src/features/tracks/ui/MinimalDetailPanel';
import { useIsMobile } from '@/hooks/use-mobile';

vi.mock('@/hooks/use-mobile');

const mockTrack = {
  id: 't1',
  title: 'Demo Track',
  audio_url: 'a1.mp3',
  cover_url: 'https://example.com/c.jpg',
  duration_seconds: 123,
  status: 'completed',
  style_tags: ['ambient', 'cinematic'],
  lyrics: 'Test lyrics',
  created_at: new Date().toISOString(),
};

describe('MinimalDetailPanel a11y', () => {
  beforeEach(() => {
    (useIsMobile as vi.Mock).mockReturnValue(true);
  });

  it('renders an accessible mobile actions menu', async () => {
    render(<MinimalDetailPanel track={mockTrack as any} onClose={() => {}} />);

    // Find and open the actions menu
    const menuTrigger = screen.getByRole('button', { name: /Track actions menu/i });
    fireEvent.click(menuTrigger);

    // The drawer content should now be visible. We can check for a class.
    const drawer = await screen.findByTestId('drawer-content');
    expect(drawer).toBeTruthy();

    // Check for some items within the drawer to ensure it's populated
    // These would be buttons in the mobile view
    const downloadButton = await screen.findByRole('button', { name: /Скачать/i });
    expect(downloadButton).toBeTruthy();

    const shareButton = await screen.findByRole('button', { name: /Поделиться/i });
    expect(shareButton).toBeTruthy();
  });

  it('renders quick actions with proper labels', () => {
    render(<MinimalDetailPanel track={mockTrack as any} onClose={() => {}} />);
    expect(screen.getByLabelText(/Воспроизвести|Пауза/i)).toBeTruthy();
    expect(screen.getByLabelText(/Скачать активную версию/i)).toBeTruthy();
  });
});