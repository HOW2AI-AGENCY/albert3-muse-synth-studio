import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { TracksList } from '../TracksList';

vi.mock('../TrackCard', () => ({
  TrackCard: ({ track }: { track: { title: string } }) => (
    <div data-testid="track-card">{track.title}</div>
  ),
}));

vi.mock('../tracks/TrackListItem', () => ({
  TrackListItem: ({ track }: { track: { title: string } }) => (
    <div data-testid="track-item">{track.title}</div>
  ),
}));

vi.mock('../tracks/ViewSwitcher', () => ({
  ViewSwitcher: ({ view, onViewChange }: { view: 'grid' | 'list'; onViewChange: (view: 'grid' | 'list') => void }) => (
    <button data-testid="view-switcher" onClick={() => onViewChange(view === 'grid' ? 'list' : 'grid')}>
      Switch View
    </button>
  ),
}));

vi.mock('../ui/LoadingSkeleton', () => ({
  LoadingSkeleton: ({ children }: { children?: ReactNode }) => (
    <div data-testid="loading-skeleton">{children}</div>
  ),
}));

vi.mock('../ui/button', () => ({
  Button: ({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('../ui/badge', () => ({
  Badge: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));

vi.mock('../tracks/TrackVersionBadge', () => ({
  TrackVersionBadge: ({ trackId }: { trackId: string }) => (
    <span data-testid={`version-badge-${trackId}`}>V</span>
  ),
}));

vi.mock('@/contexts/AudioPlayerContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/AudioPlayerContext')>(
    '@/contexts/AudioPlayerContext'
  );

  return {
    ...actual,
    useAudioPlayerSafe: () => null,
  };
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

describe('TracksList', () => {
  it('renders provided tracks in grid view', () => {
    const tracks = [
      {
        id: 'track-1',
        title: 'My Track',
        audio_url: 'https://example.com/audio.mp3',
        status: 'completed',
        created_at: new Date().toISOString(),
        prompt: 'prompt',
        improved_prompt: null,
        duration: null,
        duration_seconds: 120,
        error_message: null,
        cover_url: null,
        video_url: null,
        suno_id: null,
        model_name: null,
        created_at_suno: null,
        lyrics: null,
        style_tags: ['pop'],
        has_vocals: null,
        provider: 'suno',
        has_stems: false,
        like_count: 0,
        view_count: 0,
        play_count: 0,
        style: 'pop',
      },
    ];

    const deleteTrack = vi.fn().mockResolvedValue(undefined);

    render(
      <TracksList
        tracks={tracks as any}
        isLoading={false}
        deleteTrack={deleteTrack as any}
        refreshTracks={vi.fn()}
      />
    );

    expect(screen.getByTestId('track-card')).toHaveTextContent('My Track');
  });
});
