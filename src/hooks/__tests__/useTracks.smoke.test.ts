import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTracks } from '../useTracks';

// Hoist all mocks to prevent initialization errors
const toastMock = vi.hoisted(() => vi.fn());
const getUserMock = vi.hoisted(() => vi.fn());
const getUserTracksMock = vi.hoisted(() => vi.fn());
const deleteTrackMock = vi.hoisted(() => vi.fn());
const setTracksMock = vi.hoisted(() => vi.fn());
const removeTrackMock = vi.hoisted(() => vi.fn());
const channelOnMock = vi.hoisted(() => vi.fn());
const channelSubscribeMock = vi.hoisted(() => vi.fn());
const removeChannelMock = vi.hoisted(() => vi.fn());

const eqFinalMock = vi.hoisted(() => vi.fn().mockResolvedValue({ data: [], error: null }));
const eqFirstMock = vi.hoisted(() => vi.fn(() => ({ eq: eqFinalMock })));
const selectMock = vi.hoisted(() => vi.fn(() => ({ eq: eqFirstMock })));
const fromMock = vi.hoisted(() => vi.fn(() => ({ select: selectMock })));

const channelMock = vi.hoisted(() => {
  const mock: any = {};
  mock.on = channelOnMock.mockImplementation(() => mock);
  mock.subscribe = channelSubscribeMock.mockImplementation(() => mock);
  return mock;
});

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: getUserMock },
    channel: vi.fn(() => channelMock),
    removeChannel: removeChannelMock,
    from: fromMock,
  },
}));

vi.mock('@/services/api.service', () => ({
  ApiService: {
    getUserTracks: getUserTracksMock,
    deleteTrack: deleteTrackMock,
    createTrack: vi.fn(),
    generateMusic: vi.fn(),
  },
}));

vi.mock('@/features/tracks/api/trackCache', () => ({
  trackCache: {
    setTracks: setTracksMock,
    removeTrack: removeTrackMock,
  },
}));

describe('useTracks smoke test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    getUserTracksMock.mockResolvedValue([
      {
        id: 'track-1',
        title: 'First track',
        audio_url: 'https://example.com/audio.mp3',
        status: 'completed',
        created_at: new Date().toISOString(),
        prompt: 'prompt',
        improved_prompt: null,
        duration: null,
        duration_seconds: 120,
        error_message: null,
        cover_url: null,
        video_url: null,
        suno_id: null,
        model_name: null,
        created_at_suno: null,
        lyrics: null,
        style_tags: ['pop'],
        has_vocals: null,
        provider: 'suno',
        has_stems: false,
        like_count: 0,
        view_count: 0,
        play_count: 0,
        style: 'pop',
      },
    ]);
    deleteTrackMock.mockResolvedValue(undefined);
  });

  it('loads tracks for the current user and updates cache', async () => {
    const { result } = renderHook(() => useTracks());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(getUserTracksMock).toHaveBeenCalledWith('user-1');
    expect(result.current.tracks).toHaveLength(1);
    expect(setTracksMock).toHaveBeenCalled();
  });

  it('deletes a track and updates state', async () => {
    const { result } = renderHook(() => useTracks());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.deleteTrack('track-1');
    });

    expect(deleteTrackMock).toHaveBeenCalledWith('track-1');
    expect(removeTrackMock).toHaveBeenCalledWith('track-1');
    expect(result.current.tracks).toHaveLength(0);
    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Трек удалён' })
    );
  });
});
