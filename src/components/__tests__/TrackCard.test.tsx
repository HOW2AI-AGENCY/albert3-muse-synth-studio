import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import type { AudioPlayerTrack } from '@/types/track';

import { TrackCard } from '@/features/tracks';

const toastMock = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toasts: [],
    toast: toastMock,
    dismiss: vi.fn(),
  }),
}));

const audioPlayerMocks = vi.hoisted(() => ({
  useAudioPlayerMock: vi.fn(),
  playTrack: vi.fn(),
  togglePlayPause: vi.fn(),
  playTrackWithQueue: vi.fn(),
  pauseTrack: vi.fn(),
  seekTo: vi.fn(),
  setVolume: vi.fn(),
  playNext: vi.fn(),
  playPrevious: vi.fn(),
  addToQueue: vi.fn(),
  removeFromQueue: vi.fn(),
  clearQueue: vi.fn(),
  reorderQueue: vi.fn(),
  switchToVersion: vi.fn(),
  getAvailableVersions: vi.fn<() => AudioPlayerTrack[]>(() => []),
  clearCurrentTrack: vi.fn(),
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
vi.mock('@/features/tracks/hooks', () => ({
  useTrackLike: (...args: unknown[]) => trackLikeMocks.useTrackLikeMock(...args),
}));

vi.mock('@sentry/react', () => ({
  withErrorBoundary: (component: unknown) => component,
  captureException: vi.fn(),
}));

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
      currentTime: 0,
      duration: 0,
      volume: 1,
      queue: [],
      currentQueueIndex: 0,
      playTrack: audioPlayerMocks.playTrack,
      playTrackWithQueue: audioPlayerMocks.playTrackWithQueue,
      togglePlayPause: audioPlayerMocks.togglePlayPause,
      pauseTrack: audioPlayerMocks.pauseTrack,
      seekTo: audioPlayerMocks.seekTo,
      setVolume: audioPlayerMocks.setVolume,
      playNext: audioPlayerMocks.playNext,
      playPrevious: audioPlayerMocks.playPrevious,
      addToQueue: audioPlayerMocks.addToQueue,
      removeFromQueue: audioPlayerMocks.removeFromQueue,
      clearQueue: audioPlayerMocks.clearQueue,
      reorderQueue: audioPlayerMocks.reorderQueue,
      switchToVersion: audioPlayerMocks.switchToVersion,
      getAvailableVersions: audioPlayerMocks.getAvailableVersions,
      currentVersionIndex: 0,
      audioRef: { current: null } as RefObject<HTMLAudioElement>,
      clearCurrentTrack: audioPlayerMocks.clearCurrentTrack,
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
