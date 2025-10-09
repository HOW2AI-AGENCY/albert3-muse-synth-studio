import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TrackCard } from '../TrackCard';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

const audioPlayerMocks = vi.hoisted(() => ({
  useAudioPlayerMock: vi.fn(),
  playTrack: vi.fn(),
  togglePlayPause: vi.fn(),
}));
vi.mock('@/contexts/AudioPlayerContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/AudioPlayerContext')>(
    '@/contexts/AudioPlayerContext'
  );
  return {
    ...actual,
    useAudioPlayer: () => audioPlayerMocks.useAudioPlayerMock(),
  };
});

const trackLikeMocks = vi.hoisted(() => ({
  useTrackLikeMock: vi.fn(),
  toggleLike: vi.fn(),
}));
vi.mock('@/hooks/useTrackLike', () => ({
  useTrackLike: (...args: unknown[]) => trackLikeMocks.useTrackLikeMock(...args),
}));

vi.mock('@sentry/react', () => ({
  withErrorBoundary: (component: unknown) => component,
  captureException: vi.fn(),
}), { virtual: true });

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
}));

describe('TrackCard component', () => {
  const baseTrack = {
    id: 'track-1',
    title: 'Test Track',
    prompt: 'An energetic synthwave anthem',
    audio_url: 'https://example.com/audio.mp3',
    status: 'completed' as const,
    created_at: new Date().toISOString(),
    duration: 180,
    like_count: 2,
    view_count: 42,
    style_tags: ['synthwave', 'retro'],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    toastMock.mockClear();
    audioPlayerMocks.playTrack.mockClear();
    audioPlayerMocks.togglePlayPause.mockClear();
    audioPlayerMocks.useAudioPlayerMock.mockClear();
    trackLikeMocks.useTrackLikeMock.mockClear();
    trackLikeMocks.toggleLike.mockClear();
    audioPlayerMocks.useAudioPlayerMock.mockReturnValue({
      currentTrack: null,
      isPlaying: false,
      playTrack: audioPlayerMocks.playTrack,
      togglePlayPause: audioPlayerMocks.togglePlayPause,
    });
    trackLikeMocks.useTrackLikeMock.mockReturnValue({
      isLiked: false,
      likeCount: 2,
      toggleLike: trackLikeMocks.toggleLike,
    });
  });

  it('renders track data and handles card click', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<TrackCard track={baseTrack} onClick={onClick} />);

    expect(screen.getByText('Test Track')).toBeInTheDocument();
    expect(screen.getByText('An energetic synthwave anthem')).toBeInTheDocument();

    const card = screen.getByRole('article', { name: 'Трек Test Track' });
    await user.click(card);

    expect(onClick).toHaveBeenCalled();
  });

  it('plays track when play button is clicked', async () => {
    const user = userEvent.setup();
    render(<TrackCard track={baseTrack} />);

    const playButton = screen.getByRole('button', { name: 'Воспроизвести' });
    await user.click(playButton);

    expect(audioPlayerMocks.playTrack).toHaveBeenCalledWith(expect.objectContaining({ id: 'track-1' }));
  });

  it('toggles like state and shows feedback', async () => {
    const user = userEvent.setup();
    render(<TrackCard track={baseTrack} />);

    const buttons = screen.getAllByRole('button');
    const likeButton = buttons[1];

    await user.click(likeButton);

    expect(trackLikeMocks.toggleLike).toHaveBeenCalled();
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Добавлено в избранное',
      }),
    );
  });

  it('prevents downloads when audio is missing', async () => {
    const user = userEvent.setup();
    render(<TrackCard track={{ ...baseTrack, audio_url: undefined }} />);

    const buttons = screen.getAllByRole('button');
    const downloadButton = buttons[2];
    await user.click(downloadButton);

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ошибка',
      }),
    );
  });
});
