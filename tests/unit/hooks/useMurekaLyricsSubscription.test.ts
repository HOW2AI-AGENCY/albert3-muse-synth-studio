import { renderHook, act } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { supabase } from '@/integrations/supabase/client';
import { useMurekaLyricsSubscription } from '@/components/generator/hooks/useMurekaLyricsSubscription';

describe('useMurekaLyricsSubscription', () => {
  const onLyricsStage = vi.fn();
  const removeChannelMock = supabase.removeChannel as unknown as vi.Mock;
  const supabaseChannelMock = supabase.channel as unknown as vi.Mock;

  let storedCallback: ((payload: any) => void) | null = null;
  const subscribeMock = vi.fn();

  beforeEach(() => {
    onLyricsStage.mockReset();
    removeChannelMock.mockReset();
    subscribeMock.mockReset();
    storedCallback = null;

    supabaseChannelMock.mockImplementation(() => ({
      on: vi.fn((event: string, filter: any, callback: (payload: any) => void) => {
        storedCallback = callback;
        return { on: supabaseChannelMock.mock.results.at(-1)?.value?.on ?? vi.fn(), subscribe: subscribeMock };
      }),
      subscribe: subscribeMock,
    }));
  });

  it('subscribes and notifies when lyrics selection stage is received', () => {
    const { rerender } = renderHook((props: { trackId?: string | null }) =>
      useMurekaLyricsSubscription({
        trackId: props.trackId,
        enabled: true,
        onLyricsStage,
      }),
      { initialProps: { trackId: 'track-123' } }
    );

    expect(supabaseChannelMock).toHaveBeenCalledWith('track_lyrics_track-123');
    expect(subscribeMock).toHaveBeenCalled();

    act(() => {
      storedCallback?.({
        new: {
          id: 'track-123',
          metadata: { stage: 'lyrics_selection', lyrics_job_id: 'job-456' },
        },
      });
    });

    expect(onLyricsStage).toHaveBeenCalledWith({ trackId: 'track-123', jobId: 'job-456' });

    rerender({ trackId: 'track-123' });
  });

  it('cleans up subscription when trackId becomes falsy', () => {
    const { rerender, unmount } = renderHook((props: { trackId?: string | null }) =>
      useMurekaLyricsSubscription({
        trackId: props.trackId,
        enabled: true,
        onLyricsStage,
      }),
      { initialProps: { trackId: 'track-abc' } }
    );

    expect(supabaseChannelMock).toHaveBeenCalled();

    rerender({ trackId: null });
    expect(removeChannelMock).toHaveBeenCalled();

    unmount();
    expect(removeChannelMock).toHaveBeenCalledTimes(1);
  });

  it('restarts subscription when trackId changes', () => {
    const { rerender } = renderHook((props: { trackId?: string | null }) =>
      useMurekaLyricsSubscription({
        trackId: props.trackId,
        enabled: true,
        onLyricsStage,
      }),
      { initialProps: { trackId: 'track-a' } }
    );

    expect(supabaseChannelMock).toHaveBeenCalledWith('track_lyrics_track-a');

    rerender({ trackId: 'track-b' });

    expect(removeChannelMock).toHaveBeenCalled();
    expect(supabaseChannelMock).toHaveBeenLastCalledWith('track_lyrics_track-b');
  });
});
