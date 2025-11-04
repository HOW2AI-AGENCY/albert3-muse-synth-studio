/**
 * Unit Tests: TrackCard Component
 * TEST-007: Component Unit Tests (6h)
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackCard } from '@/features/tracks/components/TrackCard';
import * as useTrackLikesModule from '@/hooks/useTrackLikes';
import * as audioStore from '@/stores/audioPlayerStore';
import type { Track } from '@/types/domain/track.types';

// Mock dependencies
vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: vi.fn(() => false),
}));

vi.mock('@/stores/audioPlayerStore', () => ({
  useCurrentTrack: vi.fn(() => null),
  useIsPlaying: vi.fn(() => false),
  useSetCurrentTrack: vi.fn(() => vi.fn()),
  usePlayTrack: vi.fn(() => vi.fn()),
}));

vi.mock('@/hooks/useTrackLikes', () => ({
  useTrackLikes: vi.fn(() => ({
    isLiked: false,
    likeTrack: vi.fn(),
    unlikeTrack: vi.fn(),
  })),
}));

const mockTrack: Track = {
  id: 'track-123',
  title: 'Test Track',
  prompt: 'Test prompt',
  status: 'completed',
  audio_url: 'https://example.com/audio.mp3',
  cover_url: 'https://example.com/cover.jpg',
  duration: 180,
  duration_seconds: 180,
  has_vocals: true,
  has_stems: false,
  is_public: false,
  like_count: 5,
  play_count: 10,
  user_id: 'user-123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe('TrackCard', () => {
  it('should render track information', () => {
    render(<TrackCard track={mockTrack} />);

    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByRole('article')).toHaveAttribute('aria-label', expect.stringContaining('Test Track'));
  });

  it('should display cover image', () => {
    render(<TrackCard track={mockTrack} />);

    const image = screen.getByRole('img', { name: /Test Track/i });
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', expect.stringContaining('cover.jpg'));
  });

  it('should call onClick when card is clicked', () => {
    const handleClick = vi.fn();
    render(<TrackCard track={mockTrack} onClick={handleClick} />);

    fireEvent.click(screen.getByRole('article'));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should handle keyboard navigation', () => {
    const handleClick = vi.fn();
    render(<TrackCard track={mockTrack} onClick={handleClick} />);

    const card = screen.getByRole('article');
    card.focus();
    fireEvent.keyDown(card, { key: 'Enter' });

    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: ' ' });

    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('should display processing state', () => {
    const processingTrack = { ...mockTrack, status: 'processing' as const };
    render(<TrackCard track={processingTrack} />);

    expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText(/обработке/i)).toBeInTheDocument();
  });

  it('should display failed state with retry button', () => {
    const failedTrack = {
      ...mockTrack,
      status: 'failed' as const,
      error_message: 'Generation failed',
    };
    const handleRetry = vi.fn();

    render(<TrackCard track={failedTrack} onRetry={handleRetry} />);

    expect(screen.getByText(/ошибка|failed/i)).toBeInTheDocument();
    
    const retryButton = screen.getByRole('button', { name: /повтор|retry/i });
    fireEvent.click(retryButton);

    expect(handleRetry).toHaveBeenCalledWith(failedTrack.id);
  });

  it('should show like count', () => {
    render(<TrackCard track={mockTrack} />);

    expect(screen.getByText('5')).toBeInTheDocument(); // like_count
  });

  it('should toggle like on like button click', async () => {
    const mockLikeTrack = vi.fn();
    
    vi.mocked(useTrackLikesModule.useTrackLikes).mockReturnValue({
      isLiked: false,
      likeTrack: mockLikeTrack,
      unlikeTrack: vi.fn(),
    });

    render(<TrackCard track={mockTrack} />);

    const likeButton = screen.getByRole('button', { name: /лайк|like/i });
    fireEvent.click(likeButton);

    await waitFor(() => {
      expect(mockLikeTrack).toHaveBeenCalledWith(mockTrack.id);
    });
  });

  it('should open menu on menu button click', async () => {
    render(<TrackCard track={mockTrack} />);

    const menuButton = screen.getByRole('button', { name: /меню|menu|actions/i });
    fireEvent.click(menuButton);

    await waitFor(() => {
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });
  });

  it('should call onDelete when delete is clicked', async () => {
    const handleDelete = vi.fn();
    render(<TrackCard track={mockTrack} onDelete={handleDelete} />);

    // Open menu
    const menuButton = screen.getByRole('button', { name: /меню|menu/i });
    fireEvent.click(menuButton);

    // Click delete
    const deleteItem = await screen.findByRole('menuitem', { name: /удалить|delete/i });
    fireEvent.click(deleteItem);

    expect(handleDelete).toHaveBeenCalledWith(mockTrack.id);
  });

  it('should highlight current playing track', () => {
    vi.mocked(audioStore.useCurrentTrack).mockReturnValue(mockTrack);
    vi.mocked(audioStore.useIsPlaying).mockReturnValue(true);

    render(<TrackCard track={mockTrack} />);

    expect(screen.getByRole('article')).toHaveClass(/ring-primary/);
  });

  it('should handle version switching', async () => {
    const trackWithVersions = {
      ...mockTrack,
      versions: [
        { variant_index: 1, audio_url: 'v1.mp3', title: 'Variant 1' },
        { variant_index: 2, audio_url: 'v2.mp3', title: 'Variant 2' },
      ],
    };

    render(<TrackCard track={trackWithVersions as any} />);

    // Open version selector
    const versionButton = screen.getByRole('button', { name: /v1|вариант/i });
    fireEvent.click(versionButton);

    // Select variant 2
    const variant2 = await screen.findByRole('menuitem', { name: /Variant 2/i });
    fireEvent.click(variant2);

    await waitFor(() => {
      expect(screen.getByText('Variant 2')).toBeInTheDocument();
    });
  });
});
