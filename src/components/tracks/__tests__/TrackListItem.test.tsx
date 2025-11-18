import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TrackListItem } from '../TrackListItem';
import type { Track } from '@/services/api.service';

// Mock dependencies
vi.mock('@/contexts/selected-tracks/useSelectedTracks', () => ({
  useSelectedTracks: () => ({
    isSelectionMode: false,
    isTrackSelected: () => false,
    toggleTrack: vi.fn(),
  }),
}));

const mockTrack: Track = {
  id: '1',
  title: 'Test Track',
  duration: 180,
  likes_count: 100,
  views_count: 500,
  cover_url: 'https://example.com/cover.jpg',
  genre: 'Electronic',
  status: 'completed',
  has_vocals: true,
  has_stems: true,
  version_number: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  user_id: 'user-1',
};

describe('TrackListItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders track title', () => {
      render(<TrackListItem track={mockTrack} />);

      expect(screen.getByText('Test Track')).toBeInTheDocument();
    });

    it('renders cover image when available', () => {
      render(<TrackListItem track={mockTrack} />);

      const img = screen.getByAlt('Test Track');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', mockTrack.cover_url);
    });
  });

  describe('Play/Pause Button', () => {
    it('calls onPlay when play button clicked', async () => {
      const onPlay = vi.fn();
      const { container } = render(
        <TrackListItem track={mockTrack} onPlay={onPlay} isPlaying={false} />
      );

      const playButton = container.querySelector('button') as HTMLButtonElement;
      await userEvent.click(playButton);

      expect(onPlay).toHaveBeenCalledWith(mockTrack);
    });

    it('calls onPause when pause button clicked', async () => {
      const onPause = vi.fn();
      const { container } = render(
        <TrackListItem track={mockTrack} onPause={onPause} isPlaying={true} />
      );

      const pauseButton = container.querySelector('button') as HTMLButtonElement;
      await userEvent.click(pauseButton);

      expect(onPause).toHaveBeenCalledWith(mockTrack);
    });
  });

  describe('Track Badges', () => {
    it('shows vocals badge for track with vocals', () => {
      render(<TrackListItem track={mockTrack} />);

      expect(screen.getByText('Vocals')).toBeInTheDocument();
    });

    it('shows version badge', () => {
      render(<TrackListItem track={mockTrack} />);

      expect(screen.getByText('V2')).toBeInTheDocument();
    });
  });
});
