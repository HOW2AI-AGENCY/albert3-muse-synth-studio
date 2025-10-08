import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrackCard } from '../TrackCard';

const playTrackMock = vi.fn();
const togglePlayPauseMock = vi.fn();
const toggleLikeMock = vi.fn();
const toastMock = vi.fn();

const audioPlayerState = {
  currentTrack: null as { id: string } | null,
  isPlaying: false,
};

const trackLikeState = {
  isLiked: false,
  likeCount: 0,
};

vi.mock('@/contexts/AudioPlayerContext', () => ({
  useAudioPlayer: () => ({
    currentTrack: audioPlayerState.currentTrack,
    isPlaying: audioPlayerState.isPlaying,
    playTrack: playTrackMock,
    togglePlayPause: togglePlayPauseMock,
  }),
}));

vi.mock('@/hooks/useTrackLike', () => ({
  useTrackLike: () => ({
    isLiked: trackLikeState.isLiked,
    likeCount: trackLikeState.likeCount,
    toggleLike: toggleLikeMock,
  }),
}));

const toastMock = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

describe('TrackCard', () => {
  const mockTrack = {
    id: '123',
    title: 'Test Track',
    prompt: 'Test prompt',
    audio_url: 'https://example.com/audio.mp3',
    cover_url: 'https://example.com/cover.jpg',
    duration: 180,
    status: 'completed' as const,
    created_at: '2024-01-15T12:00:00Z',
    style_tags: ['rock', 'indie'],
    view_count: 100,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    audioPlayerState.currentTrack = null;
    audioPlayerState.isPlaying = false;
    trackLikeState.isLiked = false;
    trackLikeState.likeCount = 0;
  });

  afterEach(() => {
    toastMock.mockClear();
  });

  describe('Rendering', () => {
    it('renders track card with basic information', () => {
      render(<TrackCard track={mockTrack} />);
      
      expect(screen.getByText('Test Track')).toBeInTheDocument();
      expect(screen.getByText('Test prompt')).toBeInTheDocument();
    });

    it('renders duration in correct format', () => {
      render(<TrackCard track={mockTrack} />);
      
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('renders status badge for completed track', () => {
      render(<TrackCard track={mockTrack} />);
      
      expect(screen.getByLabelText(/статус: готов/i)).toBeInTheDocument();
    });

    it('renders style tags', () => {
      render(<TrackCard track={mockTrack} />);
      
      expect(screen.getByText('rock')).toBeInTheDocument();
      expect(screen.getByText('indie')).toBeInTheDocument();
    });

    it('renders cover image when available', () => {
      render(<TrackCard track={mockTrack} />);
      
      const image = screen.getByAltText(/обложка трека test track/i);
      expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('shows music icon when no cover is available', () => {
      const trackWithoutCover = { ...mockTrack, cover_url: undefined, image_url: undefined };
      render(<TrackCard track={trackWithoutCover} />);
      
      const musicIcon = screen.getByRole('article').querySelector('[aria-hidden="true"]');
      expect(musicIcon).toBeInTheDocument();
    });
  });

  describe('Compact Variant', () => {
    it('renders compact variant correctly', () => {
      render(<TrackCard track={mockTrack} variant="compact" />);
      
      expect(screen.getByText('Test Track')).toBeInTheDocument();
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });
  });

  describe('Invalid Track Data', () => {
    it('renders error message for invalid track', () => {
      // @ts-expect-error - testing invalid data
      render(<TrackCard track={{ id: null }} />);
      
      expect(screen.getByText(/некорректные данные трека/i)).toBeInTheDocument();
    });

    it('renders error message for missing track', () => {
      // @ts-expect-error - testing invalid data
      render(<TrackCard track={null} />);

      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls onClick when card is clicked', () => {
      const onClickMock = vi.fn();
      render(<TrackCard track={mockTrack} onClick={onClickMock} />);
      
      fireEvent.click(screen.getByRole('article'));
      expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    it('play button is enabled for completed tracks', () => {
      render(<TrackCard track={mockTrack} />);

      const playButton = screen.getAllByRole('button').find(
        btn => btn.getAttribute('aria-label')?.includes('Воспроизвести')
      );
      expect(playButton).not.toBeDisabled();
    });

    it('play button is disabled for processing tracks', () => {
      const processingTrack = { ...mockTrack, status: 'processing' as const };
      render(<TrackCard track={processingTrack} />);
      
      const playButtons = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('aria-label')?.includes('Воспроизвести')
      );
      playButtons.forEach(btn => expect(btn).toBeDisabled());
    });

    it('stops event propagation on action buttons', () => {
      const onClickMock = vi.fn();
      render(<TrackCard track={mockTrack} onClick={onClickMock} />);

      const likeButton = screen.getByLabelText(/добавить в избранное/i);
      fireEvent.click(likeButton);

      expect(onClickMock).not.toHaveBeenCalled();
      expect(vibrateMock).toHaveBeenCalledWith('light');
    });

    it('shows toast when sharing track', () => {
      render(<TrackCard track={mockTrack} />);

      const shareButton = screen.getByLabelText(/поделиться треком/i);
      fireEvent.click(shareButton);

      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ссылка скопирована',
        })
      );
      expect(vibrateMock).toHaveBeenCalledWith('light');
    });

    it('warns user when download is unavailable', () => {
      const trackWithoutAudio = { ...mockTrack, audio_url: undefined };
      const onDownloadMock = vi.fn();
      render(<TrackCard track={trackWithoutAudio} onDownload={onDownloadMock} />);

      const downloadButton = screen.getByLabelText(/скачать трек/i);
      fireEvent.click(downloadButton);

      expect(onDownloadMock).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ошибка скачивания',
        })
      );
    });

    it('starts playback for a new track', () => {
      render(<TrackCard track={mockTrack} />);

      const playButton = screen.getAllByRole('button').find(btn => btn.getAttribute('aria-label')?.includes('Воспроизвести'));
      expect(playButton).toBeDefined();

      fireEvent.click(playButton!);

      expect(playTrackMock).toHaveBeenCalledTimes(1);
      expect(togglePlayPauseMock).not.toHaveBeenCalled();
    });

    it('toggles pause when the current track is playing', () => {
      audioPlayerState.currentTrack = { id: mockTrack.id };
      audioPlayerState.isPlaying = true;

      render(<TrackCard track={mockTrack} />);

      const pauseButton = screen.getAllByRole('button').find(btn => btn.getAttribute('aria-label')?.includes('Приостановить'));
      expect(pauseButton).toBeDefined();

      fireEvent.click(pauseButton!);

      expect(togglePlayPauseMock).toHaveBeenCalledTimes(1);
      expect(playTrackMock).not.toHaveBeenCalled();
    });

    it('prevents playback and shows toast when audio is missing', () => {
      const trackWithoutAudio = { ...mockTrack, audio_url: undefined };
      render(<TrackCard track={trackWithoutAudio} />);

      const playButton = screen.getAllByRole('button').find(btn => btn.getAttribute('aria-label')?.includes('Воспроизвести'));
      expect(playButton).toBeDefined();

      fireEvent.click(playButton!);

      expect(playTrackMock).not.toHaveBeenCalled();
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Ошибка воспроизведения',
      }));
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<TrackCard track={mockTrack} />);
      
      expect(screen.getByRole('article')).toHaveAttribute('aria-label', 'Трек Test Track');
      expect(screen.getByLabelText(/длительность: 3:00/i)).toBeInTheDocument();
    });

    it('is keyboard accessible', () => {
      render(<TrackCard track={mockTrack} />);
      
      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('has proper button ARIA labels', () => {
      render(<TrackCard track={mockTrack} />);
      
      expect(screen.getByLabelText(/воспроизвести трек test track/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/добавить в избранное: test track/i)).toBeInTheDocument();
    });
  });

  describe('Status Handling', () => {
    it('shows processing badge for processing tracks', () => {
      const processingTrack = { ...mockTrack, status: 'processing' as const };
      render(<TrackCard track={processingTrack} />);
      
      expect(screen.getByLabelText(/статус: обработка/i)).toBeInTheDocument();
    });

    it('shows error badge for failed tracks', () => {
      const failedTrack = { ...mockTrack, status: 'failed' as const };
      render(<TrackCard track={failedTrack} />);

      expect(screen.getByLabelText(/статус: ошибка/i)).toBeInTheDocument();
    });
  });

  describe('Action handlers', () => {
    it('toggles like state and shows feedback', () => {
      trackLikeState.likeCount = 2;
      render(<TrackCard track={mockTrack} />);

      const likeButton = screen.getByLabelText(/добавить в избранное/i);
      fireEvent.click(likeButton);

      expect(toggleLikeMock).toHaveBeenCalledTimes(1);
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Добавлено в избранное',
      }));
    });

    it('calls onDownload callback and toast when audio is available', () => {
      const onDownload = vi.fn();
      render(<TrackCard track={mockTrack} onDownload={onDownload} />);

      const downloadButton = screen.getByLabelText(/скачать трек/i);
      fireEvent.click(downloadButton);

      expect(onDownload).toHaveBeenCalledTimes(1);
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Скачивание начато',
      }));
    });

    it('shows error toast when trying to download unavailable audio', () => {
      const trackWithoutAudio = { ...mockTrack, audio_url: undefined };
      render(<TrackCard track={trackWithoutAudio} />);

      const downloadButton = screen.getByLabelText(/скачать трек/i);
      fireEvent.click(downloadButton);

      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Ошибка скачивания',
      }));
    });

    it('calls onShare callback and toast', () => {
      const onShare = vi.fn();
      render(<TrackCard track={mockTrack} onShare={onShare} />);

      const shareButton = screen.getByLabelText(/поделиться треком/i);
      fireEvent.click(shareButton);

      expect(onShare).toHaveBeenCalledTimes(1);
      expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Ссылка скопирована',
      }));
    });
  });
});
