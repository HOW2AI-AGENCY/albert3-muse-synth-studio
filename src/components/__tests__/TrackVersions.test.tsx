import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RefObject } from 'react';
import type { AudioPlayerTrack } from '@/types/track';

import { TrackVersions } from '@/features/tracks';

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

vi.mock('@/hooks/useHapticFeedback', () => ({
  useHapticFeedback: () => ({ vibrate: vi.fn() }),
}));

vi.mock('@sentry/react', () => ({
  withScope: vi.fn(),
  captureException: vi.fn(),
}));

const toastMocks = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock('sonner', () => ({
  toast: toastMocks,
}));

const supabaseMocks = vi.hoisted(() => {
  const obj = {
    updateEq: vi.fn(),
    deleteEq: vi.fn(),
    update: vi.fn(() => ({ eq: obj.updateEq } as const)),
    delete: vi.fn(() => ({ eq: obj.deleteEq } as const)),
    from: vi.fn((table: string) => ({ update: obj.update, delete: obj.delete })),
  };
  return obj;
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: supabaseMocks.from,
  },
}));

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

describe('TrackVersions component', () => {
  const baseVersions = [
    {
      id: 'track-main',
      suno_id: 'track-main-suno',
      version_number: 0,
      is_master: true,
      audio_url: 'main.mp3',
      duration: 120,
    },
    {
      id: 'track-alt',
      suno_id: 'track-alt-suno',
      version_number: 1,
      is_master: false,
      audio_url: 'alt.mp3',
      duration: 100,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    toastMocks.success.mockClear();
    toastMocks.error.mockClear();
    audioPlayerMocks.useAudioPlayerMock.mockClear();
    audioPlayerMocks.playTrack.mockClear();
    audioPlayerMocks.togglePlayPause.mockClear();
    supabaseMocks.updateEq.mockClear();
    supabaseMocks.deleteEq.mockClear();
    supabaseMocks.update.mockClear();
    supabaseMocks.delete.mockClear();
    supabaseMocks.from.mockClear();

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
    supabaseMocks.updateEq.mockResolvedValue({ error: null });
    supabaseMocks.deleteEq.mockResolvedValue({ error: null });
  });

  it('does not render when there is a single version', () => {
    const { container } = render(
      <TrackVersions trackId="track-1" versions={[baseVersions[0]]} />
    );

    expect(container.firstChild).toBeNull();
  });

  it('expands versions list and plays a selected version', async () => {
    const user = userEvent.setup();

    render(<TrackVersions trackId="track-1" versions={baseVersions} />);

    const toggleButton = screen.getAllByRole('button')[0];
    await user.click(toggleButton);

    const versionCard = await screen.findByText('Версия 1');
    const cardRoot = versionCard.closest('.flex');
    expect(cardRoot).not.toBeNull();

    const playButton = within(cardRoot!.parentElement!.parentElement!).getAllByRole('button')[0];
    await user.click(playButton);

    expect(audioPlayerMocks.playTrack).toHaveBeenCalledWith(expect.objectContaining({ id: 'track-alt' }));
  });

  it('sets a master version and notifies parent', async () => {
    const user = userEvent.setup();
    const onVersionUpdate = vi.fn();

    render(<TrackVersions trackId="track-1" versions={baseVersions} onVersionUpdate={onVersionUpdate} />);

    const toggleButton = screen.getAllByRole('button')[0];
    await user.click(toggleButton);

    const versionCard = await screen.findByText('Версия 1');
    const containerNode = versionCard.closest('div');
    const masterButton = within(containerNode!.parentElement!.parentElement!).getByRole('button', { name: /Сделать главной|Главная/ });
    await user.click(masterButton);

    expect(supabaseMocks.update).toHaveBeenCalled();
    expect(onVersionUpdate).toHaveBeenCalled();
    expect(toastMocks.success).toHaveBeenCalled();
  });

  it('deletes a version after confirmation', async () => {
    const user = userEvent.setup();

    render(
      <TrackVersions
        trackId="track-1"
        versions={[
          {
            id: 'track-main',
            suno_id: 'track-main-suno',
            version_number: 0,
            is_master: true,
            audio_url: 'main.mp3',
            duration: 120,
          },
          {
            id: 'track-alt',
            suno_id: 'track-alt-suno',
            version_number: 1,
            is_master: false,
            audio_url: 'alt.mp3',
            duration: 100,
          },
          {
            id: 'track-extra',
            suno_id: 'track-extra-suno',
            version_number: 2,
            is_master: false,
            audio_url: 'extra.mp3',
            duration: 90,
          },
        ]}
      />
    );

    const toggleButton = screen.getAllByRole('button')[0];
    await user.click(toggleButton);

    const versionCard = await screen.findByText('Версия 2');
    const cardRoot = versionCard.closest('div');
    const deleteButton = within(cardRoot!.parentElement!.parentElement!).getAllByRole('button').pop();
    await user.click(deleteButton!);

    expect(await screen.findByText('Удалить версию?')).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: 'Удалить' });
    await user.click(confirmButton);

    expect(supabaseMocks.delete).toHaveBeenCalled();
    expect(toastMocks.success).toHaveBeenCalled();
  });
});
