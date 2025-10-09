import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTracks } from '../useTracks';

const toastMock = vi.fn();
const getUserMock = vi.fn();
const getUserTracksMock = vi.fn();
const deleteTrackMock = vi.fn();
const setTracksMock = vi.fn();
const removeTrackMock = vi.fn();
const channelOnMock = vi.fn();
const channelSubscribeMock = vi.fn();
const removeChannelMock = vi.fn();

const eqFinalMock = vi.fn().mockResolvedValue({ data: [], error: null });
const eqFirstMock = vi.fn(() => ({ eq: eqFinalMock }));
const selectMock = vi.fn(() => ({ eq: eqFirstMock }));
const fromMock = vi.fn(() => ({ select: selectMock }));

const channelMock: any = {};
channelMock.on = channelOnMock.mockImplementation(() => channelMock);
channelMock.subscribe = channelSubscribeMock.mockImplementation(() => channelMock);

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
