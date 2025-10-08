import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TrackListItem } from '../TrackListItem';
import { useAudioPlayer, useAudioPlayerSafe } from '@/hooks/useAudioPlayer';
import { useToast } from '@/hooks/use-toast';
import { useTrackLike } from '@/hooks/useTrackLike';
import { DisplayTrack } from '@/types/track';
import { supabase } from '@/integrations/supabase/client';

// Mock the source of the hooks
vi.mock('@/contexts/AudioPlayerContext', () => ({
  useAudioPlayer: vi.fn(),
  useAudioPlayerSafe: vi.fn(),
}));
vi.mock('@/hooks/use-toast');
vi.mock('@/hooks/useTrackLike');
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn().mockResolvedValue({ error: null }),
  },
}));

describe('TrackListItem', () => {
  const mockTrack: DisplayTrack = {
    id: 'track-1',
    title: 'Test Track',
    prompt: 'Test prompt',
    audio_url: 'https://example.com/audio.mp3',
    cover_url: 'https://example.com/cover.jpg',
    duration: 180,
    status: 'completed' as const,
    created_at: '2024-01-15T12:00:00Z',
    style_tags: ['rock', 'indie'],
    like_count: 5,
    is_liked: false,
  };

  const playTrackMock = vi.fn();
  const pauseTrackMock = vi.fn();
  const toastMock = vi.fn();
  const toggleLikeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAudioPlayer as vi.Mock).mockReturnValue({
      currentTrack: null,
      isPlaying: false,
      playTrack: playTrackMock,
      pauseTrack: pauseTrackMock,
    });
    (useAudioPlayerSafe as vi.Mock).mockReturnValue({
      currentTrack: null,
      isPlaying: false,
      playTrack: playTrackMock,
      pauseTrack: pauseTrackMock,
    });
    (useToast as vi.Mock).mockReturnValue({
      toast: toastMock,
    });
    (useTrackLike as vi.Mock).mockReturnValue({
      isLiked: false,
      likeCount: 5,
      toggleLike: toggleLikeMock,
      isLoading: false,
    });
  });

  const setup = (props: Partial<React.ComponentProps<typeof TrackListItem>> = {}) => {
    return render(<TrackListItem track={mockTrack} {...props} />);
  };

  describe('Rendering', () => {
    it('renders track information', () => {
      setup();
      expect(screen.getByText('Test Track')).toBeInTheDocument();
    });

    it('renders track cover image', () => {
      setup();
      const image = screen.getByAltText(/test track/i);
      expect(image).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('renders duration', () => {
      setup();
      expect(screen.getByText('3:00')).toBeInTheDocument();
    });

    it('renders style tags', () => {
      setup();
      expect(screen.getByText('rock')).toBeInTheDocument();
      expect(screen.getByText('indie')).toBeInTheDocument();
    });

    it('renders index when provided in compact mode', () => {
      setup({ index: 0, compact: true });
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('shows like count', () => {
      setup();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('Compact Mode', () => {
    it('renders in compact mode', () => {
      setup({ compact: true, index: 0 });
      expect(screen.getByText('Test Track')).toBeInTheDocument();
      expect(screen.queryByText('rock')).not.toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('calls playTrack when play button is clicked', async () => {
      const { getByTestId } = setup();
      fireEvent.mouseEnter(getByTestId(`track-list-item-${mockTrack.id}`));
      const playButton = await screen.findByRole('button', { name: /воспроизвести/i });
      fireEvent.click(playButton);
      expect(playTrackMock).toHaveBeenCalled();
    });

    it('shows pause button for currently playing track', async () => {
      (useAudioPlayerSafe as vi.Mock).mockReturnValue({
        currentTrack: { id: 'track-1' },
        isPlaying: true,
      });
      const { getByTestId } = setup();
      fireEvent.mouseEnter(getByTestId(`track-list-item-${mockTrack.id}`));
      expect(await screen.findByRole('button', { name: /пауза/i })).toBeInTheDocument();
    });

    it('handles like button click', async () => {
      const { getByTestId } = setup();
      fireEvent.mouseEnter(getByTestId(`track-list-item-${mockTrack.id}`));
      const likeButton = await screen.findByRole('button', { name: /добавить в избранное/i });
      fireEvent.click(likeButton);
      expect(toggleLikeMock).toHaveBeenCalled();
    });

    it('calls onDownload when download button is clicked', async () => {
      const onDownloadMock = vi.fn();
      const { getByTestId } = setup({ onDownload: onDownloadMock });
      fireEvent.mouseEnter(getByTestId(`track-list-item-${mockTrack.id}`));
      const downloadButton = await screen.findByRole('button', { name: /скачать/i });
      fireEvent.click(downloadButton);
      await waitFor(() => {
        expect(onDownloadMock).toHaveBeenCalledWith('track-1');
      });
    });

    it('calls onShare when share button is clicked', async () => {
      const onShareMock = vi.fn();
      const { getByTestId } = setup({ onShare: onShareMock });
      fireEvent.mouseEnter(getByTestId(`track-list-item-${mockTrack.id}`));
      const shareButton = await screen.findByRole('button', { name: /поделиться/i });
      fireEvent.click(shareButton);
      expect(onShareMock).toHaveBeenCalledWith('track-1');
    });
  });

  describe('Track Without Audio', () => {
    const trackWithoutAudio = { ...mockTrack, audio_url: undefined };

    it('disables play button when audio_url is missing', async () => {
      const { getByTestId } = setup({ track: trackWithoutAudio });
      fireEvent.mouseEnter(getByTestId(`track-list-item-${trackWithoutAudio.id}`));
      const playButton = await screen.findByRole('button', { name: /воспроизвести/i });
      expect(playButton).toBeDisabled();
    });

    it('shows error toast when trying to download without audio_url', async () => {
      const { getByTestId } = setup({ track: trackWithoutAudio });
      fireEvent.mouseEnter(getByTestId(`track-list-item-${trackWithoutAudio.id}`));
      const downloadButton = await screen.findByRole('button', { name: /скачать/i });
      fireEvent.click(downloadButton);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: expect.stringContaining('Ошибка'),
          variant: 'destructive',
        })
      );
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for buttons', async () => {
      const { getByTestId } = setup();
      fireEvent.mouseEnter(getByTestId(`track-list-item-${mockTrack.id}`));
      expect(await screen.findByRole('button', { name: 'Воспроизвести' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Добавить в избранное' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Скачать трек' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Поделиться треком' })).toBeInTheDocument();
      expect(await screen.findByRole('button', { name: 'Дополнительные действия' })).toBeInTheDocument();
    });

    it('has accessible image alt text', () => {
      setup();
      expect(screen.getByAltText(/test track/i)).toBeInTheDocument();
    });
  });
});