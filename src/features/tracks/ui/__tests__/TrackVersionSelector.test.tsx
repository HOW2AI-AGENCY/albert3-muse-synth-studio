import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { TrackVersionSelector } from '../TrackVersionSelector';

const audioPlayerMocks = vi.hoisted(() => ({
  useAudioPlayerMock: vi.fn(),
  switchToVersion: vi.fn(),
  togglePlayPause: vi.fn(),
  playTrack: vi.fn(),
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
  getAvailableVersions: vi.fn(() => []),
  clearCurrentTrack: vi.fn(),
}));

const createAudioPlayerValue = () => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  queue: [],
  currentQueueIndex: -1,
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
  audioRef: { current: null },
  clearCurrentTrack: audioPlayerMocks.clearCurrentTrack,
});

vi.mock('@/contexts/AudioPlayerContext', async () => {
  const actual = await vi.importActual<typeof import('@/contexts/AudioPlayerContext')>(
    '@/contexts/AudioPlayerContext',
  );

  return {
    ...actual,
    useAudioPlayer: () => audioPlayerMocks.useAudioPlayerMock(),
  };
});

beforeAll(() => {
  Object.assign(Element.prototype, {
    hasPointerCapture: () => false,
    setPointerCapture: () => {},
    releasePointerCapture: () => {},
    scrollIntoView: () => {},
  });
});

describe('TrackVersionSelector', () => {
  const versions = [
    {
      id: 'version-a',
      version_number: 1,
      created_at: '2024-01-01T00:00:00.000Z',
      is_master: true,
    },
    {
      id: 'version-b',
      version_number: 2,
      created_at: '2024-02-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    audioPlayerMocks.useAudioPlayerMock.mockReturnValue(createAudioPlayerValue());
  });

  it('calls switchToVersion when selecting a new version from the list', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(
      <TrackVersionSelector versions={versions} selectedVersionId={versions[0].id} onSelect={onSelect} />,
    );

    const trigger = screen.getByRole('combobox', { name: 'Выбор версии трека' });
    await user.click(trigger);

    const option = await screen.findByRole('option', { name: /Версия 2/ });
    await user.click(option);

    expect(onSelect).toHaveBeenCalledWith('version-b');
    expect(audioPlayerMocks.switchToVersion).toHaveBeenCalledWith('version-b');
  });

  it('toggles play/pause when the current version is playing', async () => {
    const user = userEvent.setup();

    audioPlayerMocks.useAudioPlayerMock.mockReturnValue({
      ...createAudioPlayerValue(),
      currentTrack: { id: 'version-b' } as unknown,
      isPlaying: true,
      togglePlayPause: audioPlayerMocks.togglePlayPause,
      switchToVersion: audioPlayerMocks.switchToVersion,
    });

    render(
      <TrackVersionSelector versions={versions} selectedVersionId={versions[0].id} />,
    );

    const pauseButton = screen.getByRole('button', { name: 'Пауза версии 2' });
    await user.click(pauseButton);

    expect(audioPlayerMocks.togglePlayPause).toHaveBeenCalledTimes(1);
    expect(audioPlayerMocks.switchToVersion).not.toHaveBeenCalled();
  });

  it('activates slot B playback through comparison controls', async () => {
    const user = userEvent.setup();

    render(<TrackVersionSelector versions={versions} selectedVersionId={versions[0].id} />);

    const assignBButton = screen.getByRole('button', { name: 'Назначить версию 2 как B' });
    await user.click(assignBButton);

    const listenBButton = screen.getByRole('button', { name: 'Слушать версию B' });
    await user.click(listenBButton);

    expect(audioPlayerMocks.switchToVersion).toHaveBeenCalledWith('version-b');
  });
});
