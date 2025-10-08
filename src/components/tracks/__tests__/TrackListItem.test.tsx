import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackListItem } from '../TrackListItem';

// Mock hooks
vi.mock('@/hooks/useAudioPlayer', () => ({
  useAudioPlayer: () => ({
    currentTrack: null,
    isPlaying: false,
    playTrack: vi.fn(),
    pauseTrack: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('TrackListItem', () => {
  const mockTrack = {
    id: 'track-1',
    title: 'Test Track',
    prompt: 'Test prompt',
    audio_url: 'https://example.com/audio.mp3',
    cover_url: 'https://example.com/cover.jpg',
    duration_seconds: 180,
    status: 'completed' as const,
    created_at: '2024-01-15T12:00:00Z',
    style_tags: ['rock', 'indie'],
    like_count: 5,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders track information', () => {
      render(<TrackListItem track={mockTrack} />);
      
      expect(screen.getByText('Test Track')).toBeInTheDocument();
    });

    it('renders track cover image', () => {
      render(<TrackListItem track={mockTrack} />);
      
      const image = screen.getByAltText(/test track/i);
      expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('renders duration', () => {
      render(<TrackListItem track={mockTrack} />);
      
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('renders style tags', () => {
      render(<TrackListItem track={mockTrack} />);
      
      expect(screen.getByText('rock')).toBeInTheDocument();
      expect(screen.getByText('indie')).toBeInTheDocument();
    });

    it('renders index when provided', () => {
      render(<TrackListItem track={mockTrack} index={1} />);
      
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows like count', () => {
      render(<TrackListItem track={mockTrack} />);
      
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      render(<TrackListItem track={mockTrack} compact={true} />);
      
      expect(screen.getByText('Test Track')).toBeInTheDocument();
      // Compact mode should still show essential information
    });
  });

  describe('User Interactions', () => {
    it('calls playTrack when play button is clicked', () => {
      const playTrackMock = vi.fn();
      vi.mocked(require('@/hooks/useAudioPlayer').useAudioPlayer).mockReturnValue({
        currentTrack: null,
        isPlaying: false,
        playTrack: playTrackMock,
        pauseTrack: vi.fn(),
      });

      render(<TrackListItem track={mockTrack} />);
      
      const playButton = screen.getByRole('button', { name: /play|воспроизвести/i });
      fireEvent.click(playButton);
      
      expect(playTrackMock).toHaveBeenCalled();
    });

    it('shows pause button for currently playing track', () => {
      vi.mocked(require('@/hooks/useAudioPlayer').useAudioPlayer).mockReturnValue({
        currentTrack: { id: 'track-1', title: 'Test Track' },
        isPlaying: true,
        playTrack: vi.fn(),
        pauseTrack: vi.fn(),
      });

      render(<TrackListItem track={mockTrack} />);
      
      expect(screen.getByRole('button', { name: /pause|приостановить/i })).toBeInTheDocument();
    });

    it('handles like button click', () => {
      render(<TrackListItem track={mockTrack} />);
      
      const likeButton = screen.getByRole('button', { name: /like|избранн/i });
      fireEvent.click(likeButton);
      
      // Проверяем, что кнопка кликабельна (useTrackLike обработает лайк)
      expect(likeButton).toBeInTheDocument();
    });

    it('calls onDownload when download button is clicked', () => {
      const onDownloadMock = vi.fn();
      
      render(<TrackListItem track={mockTrack} onDownload={onDownloadMock} />);
      
      const downloadButton = screen.getByRole('button', { name: /download|скачать/i });
      fireEvent.click(downloadButton);
      
      expect(onDownloadMock).toHaveBeenCalledWith('track-1');
    });

    it('calls onShare when share button is clicked', () => {
      const onShareMock = vi.fn();
      
      render(<TrackListItem track={mockTrack} onShare={onShareMock} />);
      
      const shareButton = screen.getByRole('button', { name: /share|поделиться/i });
      fireEvent.click(shareButton);
      
      expect(onShareMock).toHaveBeenCalledWith('track-1');
    });

    it('renders like button', () => {
      render(<TrackListItem track={mockTrack} />);
      
      const likeButton = screen.getByRole('button', { name: /like|избранн/i });
      expect(likeButton).toBeInTheDocument();
    });
  });

  describe('Track Without Audio', () => {
    it('disables play button when audio_url is missing', () => {
      const trackWithoutAudio = { ...mockTrack, audio_url: undefined };
      
      render(<TrackListItem track={trackWithoutAudio} />);
      
      const playButton = screen.getByRole('button', { name: /play|воспроизвести/i });
      expect(playButton).toBeDisabled();
    });

    it('shows error toast when trying to download without audio_url', () => {
      const toastMock = vi.fn();
      vi.mocked(require('@/hooks/use-toast').useToast).mockReturnValue({
        toast: toastMock,
      });

      const trackWithoutAudio = { ...mockTrack, audio_url: undefined };
      const onDownloadMock = vi.fn();
      
      render(<TrackListItem track={trackWithoutAudio} onDownload={onDownloadMock} />);
      
      const downloadButton = screen.getByRole('button', { name: /download|скачать/i });
      fireEvent.click(downloadButton);
      
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Ошибка'),
          variant: 'destructive',
        })
      );
      expect(onDownloadMock).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', () => {
      render(<TrackListItem track={mockTrack} />);
      
      expect(screen.getByRole('button', { name: /play|воспроизвести/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /like|избранн/i })).toBeInTheDocument();
    });

    it('has accessible image alt text', () => {
      render(<TrackListItem track={mockTrack} />);
      
      const image = screen.getByAltText(/test track/i);
      expect(image).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('applies visibility animation on mount', () => {
      const { container } = render(<TrackListItem track={mockTrack} />);
      
      // Component should have animation-related classes
      expect(container.querySelector('[class*="transition"]')).toBeInTheDocument();
    });
  });
});
