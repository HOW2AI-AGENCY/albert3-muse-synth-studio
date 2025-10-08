import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { AudioPlayerProvider, useAudioPlayer } from '../AudioPlayerContext';
import type { AudioPlayerTrack } from '@/types/track';

const toastMock = vi.fn();
const getTrackWithVersionsMock = vi.fn();
const cacheAudioFileMock = vi.fn();

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/hooks/usePlayAnalytics', () => ({
  usePlayAnalytics: vi.fn(() => ({ playTime: 0, hasRecorded: false })),
}));

vi.mock('@/utils/trackVersions', () => ({
  getTrackWithVersions: getTrackWithVersionsMock,
}));

vi.mock('../utils/serviceWorker', () => ({
  cacheAudioFile: cacheAudioFileMock,
}));

const baseTrack: AudioPlayerTrack = {
  id: 'track-1',
  title: 'Test Track',
  audio_url: 'https://example.com/audio',
  cover_url: 'https://example.com/cover.jpg',
  duration: 120,
  style_tags: ['pop'],
  lyrics: 'Lyrics',
  status: 'completed',
};

const versions = [
  {
    id: 'track-1',
    title: 'Test Track',
    audio_url: 'https://example.com/audio.mp3',
    cover_url: 'https://example.com/cover.jpg',
    duration: 120,
    style_tags: ['pop'],
    lyrics: 'Lyrics',
    status: 'completed',
    parentTrackId: 'track-1',
    versionNumber: 0,
    isMasterVersion: true,
  },
  {
    id: 'track-1-v2',
    title: 'Test Track V2',
    audio_url: 'https://example.com/audio-v2.mp3',
    cover_url: 'https://example.com/cover.jpg',
    duration: 123,
    style_tags: ['pop'],
    lyrics: 'Lyrics',
    status: 'completed',
    parentTrackId: 'track-1',
    versionNumber: 1,
    isMasterVersion: false,
  },
];

const TestConsumer = ({ onReady }: { onReady: (value: ReturnType<typeof useAudioPlayer>) => void }) => {
  const context = useAudioPlayer();

  useEffect(() => {
    onReady(context);
  }, [context, onReady]);

  return null;
};

const setup = async () => {
  let contextValue: ReturnType<typeof useAudioPlayer> | null = null;

  render(
    <AudioPlayerProvider>
      <TestConsumer onReady={value => { contextValue = value; }} />
    </AudioPlayerProvider>
  );

  await waitFor(() => {
    expect(contextValue).not.toBeNull();
  });

  return contextValue!;
};

const resetMediaMocks = () => {
  const playMock = vi.fn().mockResolvedValue(undefined);
  const pauseMock = vi.fn();
  const loadMock = vi.fn();

  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    configurable: true,
    writable: true,
    value: playMock,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    writable: true,
    value: pauseMock,
  });
  Object.defineProperty(window.HTMLMediaElement.prototype, 'load', {
    configurable: true,
    writable: true,
    value: loadMock,
  });

  return { playMock, pauseMock, loadMock };
};

describe('AudioPlayerContext', () => {
  beforeEach(() => {
    toastMock.mockClear();
    getTrackWithVersionsMock.mockResolvedValue(versions);
    cacheAudioFileMock.mockResolvedValue(undefined);
  });

  it('plays a track and updates the state', async () => {
    const { playMock } = resetMediaMocks();
    const context = await setup();

    await context.playTrack(baseTrack);

    await waitFor(() => {
      expect(playMock).toHaveBeenCalled();
    });

    const audioElement = document.querySelector('audio') as HTMLAudioElement;
    expect(audioElement.src).toBe('https://example.com/audio.mp3');
    expect(context.currentTrack?.id).toBe('track-1');
    await waitFor(() => {
      expect(context.isPlaying).toBe(true);
    });
  });

  it('switches between track versions', async () => {
    const { playMock } = resetMediaMocks();
    const context = await setup();

    await context.playTrack(baseTrack);
    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(1));

    await waitFor(() => expect(context.currentVersionIndex).toBe(0));

    context.switchToVersion('track-1-v2');

    await waitFor(() => expect(playMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(context.currentVersionIndex).toBe(1));

    const audioElement = document.querySelector('audio') as HTMLAudioElement;
    expect(audioElement.src).toBe('https://example.com/audio-v2.mp3');
  });

  it('shows an error toast when playback fails', async () => {
    const { playMock } = resetMediaMocks();
    playMock.mockRejectedValueOnce(new Error('Playback failed'));
    const context = await setup();

    await context.playTrack(baseTrack);

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Ошибка воспроизведения',
          variant: 'destructive',
        })
      );
    });
    expect(context.isPlaying).toBe(false);
  });
});
