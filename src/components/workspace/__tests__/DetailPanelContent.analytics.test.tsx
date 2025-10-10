import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { DetailPanelContent } from '../DetailPanelContent';
import { supabase } from '@/integrations/supabase/client';
import { viewSessionGuard } from '@/services/analytics.service';

vi.mock('@/hooks/useTrackLike', () => ({
  useTrackLike: () => ({
    isLiked: false,
    likeCount: 0,
    toggleLike: vi.fn(),
  }),
}));

vi.mock('@/components/tracks/TrackVersions', () => ({
  TrackVersions: () => null,
}));

vi.mock('@/components/tracks/TrackStemsPanel', () => ({
  TrackStemsPanel: () => null,
}));

vi.mock('@/components/workspace/StyleRecommendationsPanel', () => ({
  StyleRecommendationsPanel: () => null,
}));

describe('DetailPanelContent analytics integration', () => {
  const baseTrack = {
    id: 'track-123',
    title: 'Test track',
    prompt: 'A calm piano piece',
    status: 'completed' as const,
    audio_url: 'https://example.com/audio.mp3',
    created_at: new Date().toISOString(),
    like_count: 0,
    view_count: 0,
  };

  const defaultProps = {
    track: baseTrack,
    title: baseTrack.title,
    setTitle: vi.fn(),
    genre: '',
    setGenre: vi.fn(),
    mood: '',
    setMood: vi.fn(),
    isPublic: true,
    setIsPublic: vi.fn(),
    isSaving: false,
    versions: [],
    stems: [],
    onSave: vi.fn(),
    onDownload: vi.fn(),
    onShare: vi.fn(),
    onDelete: vi.fn(),
    loadVersionsAndStems: vi.fn(),
  };

  let rpcSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    viewSessionGuard.clear();
    try {
      globalThis.sessionStorage?.clear();
    } catch (error) {
      // ignore session storage issues in tests
    }
    rpcSpy = vi.spyOn(supabase, 'rpc' as any).mockResolvedValue({ data: null, error: null } as any);
  });

  afterEach(() => {
    rpcSpy.mockRestore();
  });

  it('records view and play counters when the detail panel mounts', async () => {
    render(<DetailPanelContent {...defaultProps} />);

    await waitFor(() => expect(rpcSpy).toHaveBeenCalledTimes(2));
    expect(rpcSpy).toHaveBeenCalledWith('increment_view_count', { track_id: baseTrack.id });
    expect(rpcSpy).toHaveBeenCalledWith('increment_play_count', { track_id: baseTrack.id });
  });

  it('avoids duplicate counter calls during the same session', async () => {
    const { unmount } = render(<DetailPanelContent {...defaultProps} />);
    await waitFor(() => expect(rpcSpy).toHaveBeenCalledTimes(2));

    rpcSpy.mockClear();
    unmount();
    render(
      <DetailPanelContent
        {...defaultProps}
        track={{ ...baseTrack }}
      />
    );

    await waitFor(() => {
      expect(rpcSpy).not.toHaveBeenCalled();
    }, { timeout: 200 });
  });
});
