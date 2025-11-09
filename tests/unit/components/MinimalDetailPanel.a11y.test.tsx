import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
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
  it('renders versions tablist with accessible roles', () => {
    render(<MinimalDetailPanel track={mockTrack as any} onClose={() => {}} />);
    const tablist = screen.getByRole('tablist', { name: /Список вариантов трека/i });
expect(tablist).toBeTruthy();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThan(0);
  });

  it('renders quick actions with proper labels', () => {
    render(<MinimalDetailPanel track={mockTrack as any} onClose={() => {}} />);
    expect(screen.getByLabelText(/Воспроизвести|Пауза/i)).toBeTruthy();
    expect(screen.getByLabelText(/Скачать активную версию/i)).toBeTruthy();
  });
});