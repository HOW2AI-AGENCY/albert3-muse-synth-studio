/**
 * Unit Tests: useTrackVersions Hook
 * TEST-006: React Hooks Unit Tests (continued)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTrackVersions, resetTrackVersionsCache } from '@/features/tracks/hooks/useTrackVersions';
import * as api from '@/features/tracks/api/trackVersions';
import { TrackWithVersions } from '@/features/tracks/api/trackVersions';

// Mock the API module
vi.mock('@/features/tracks/api/trackVersions', async (importOriginal) => {
  const original = await importOriginal<typeof api>();
  return {
    ...original,
    getTrackWithVersions: vi.fn(),
  };
});

const mockGetTrackWithVersions = vi.mocked(api.getTrackWithVersions);

const mockVersions: TrackWithVersions[] = [
  { id: 'v1', parent_track_id: 'track-1', sourceVersionNumber: 0, is_primary_variant: true, audio_url: 'url0' } as TrackWithVersions,
  { id: 'v2', parent_track_id: 'track-1', sourceVersionNumber: 1, is_primary_variant: false, audio_url: 'url1' } as TrackWithVersions,
  { id: 'v3', parent_track_id: 'track-1', sourceVersionNumber: 2, is_primary_variant: false, audio_url: 'url2' } as TrackWithVersions,
];

describe('useTrackVersions', () => {
  afterEach(() => {
    vi.clearAllMocks();
    resetTrackVersionsCache();
  });

  it('should return correct counts and versions when data is fetched', async () => {
    mockGetTrackWithVersions.mockResolvedValue(mockVersions);

    const { result } = renderHook(() => useTrackVersions('track-1'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.allVersions).toHaveLength(3);
    expect(result.current.versions).toHaveLength(2); // Excludes the main version
    expect(result.current.additionalVersionCount).toBe(2);
    expect(result.current.totalVersionCount).toBe(3);
    expect(result.current.mainVersion?.id).toBe('v1');
    expect(result.current.hasVersions).toBe(true);
  });

  it('should return correct values when only a main version exists', async () => {
    const mainOnly = [mockVersions[0]];
    mockGetTrackWithVersions.mockResolvedValue(mainOnly);

    const { result } = renderHook(() => useTrackVersions('track-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.versions).toHaveLength(0);
    expect(result.current.additionalVersionCount).toBe(0);
    expect(result.current.hasVersions).toBe(false);
    expect(result.current.mainVersion).not.toBeNull();
  });

  it('should handle empty array from API', async () => {
    mockGetTrackWithVersions.mockResolvedValue([]);

    const { result } = renderHook(() => useTrackVersions('track-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.allVersions).toHaveLength(0);
    expect(result.current.additionalVersionCount).toBe(0);
    expect(result.current.mainVersion).toBeNull();
    expect(result.current.hasVersions).toBe(false);
  });

  it('should not fetch when trackId is null', () => {
    const { result } = renderHook(() => useTrackVersions(null));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.allVersions).toHaveLength(0);
    expect(mockGetTrackWithVersions).not.toHaveBeenCalled();
  });

  it('should handle API errors gracefully', async () => {
    const testError = new Error('Failed to fetch');
    mockGetTrackWithVersions.mockRejectedValue(testError);

    const { result } = renderHook(() => useTrackVersions('track-1'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe(testError);
    expect(result.current.allVersions).toHaveLength(0);
  });
});
