/**
 * Unit Tests: useTrackVersions Hook
 * TEST-006: React Hooks Unit Tests (continued)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useTrackVersions, resetTrackVersionsCache } from '@/features/tracks/hooks/useTrackVersions';
import { getTrackWithVersions, TrackWithVersions } from '@/features/tracks/api/trackVersions';

// Mock the API module to control fetch results
vi.mock('@/features/tracks/api/trackVersions', () => ({
  getTrackWithVersions: vi.fn(),
  getMasterVersion: (versions: TrackWithVersions[]) => versions.find(v => v.is_preferred_variant) || null,
  setMasterVersion: vi.fn(),
  unwrapResult: vi.fn(),
}));

const mockedGetTrackWithVersions = vi.mocked(getTrackWithVersions);

describe('useTrackVersions', () => {
  beforeEach(() => {
    // Reset mocks and cache before each test to ensure isolation
    vi.resetAllMocks();
    resetTrackVersionsCache();
  });

  it('should count additional versions correctly', async () => {
    const mockVersions: Partial<TrackWithVersions>[] = [
      { id: 'v0', sourceVersionNumber: 0, audio_url: 'url' },
      { id: 'v1', sourceVersionNumber: 1, audio_url: 'url' },
      { id: 'v2', sourceVersionNumber: 2, audio_url: 'url' },
      { id: 'v3', sourceVersionNumber: 3, audio_url: 'url' },
    ];
    mockedGetTrackWithVersions.mockResolvedValue(mockVersions as TrackWithVersions[]);

    const { result } = renderHook(() => useTrackVersions('test-track-id'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.additionalVersionCount).toBe(3);
    expect(result.current.totalVersionCount).toBe(4);
  });

  it('should filter out main version (sourceVersionNumber: 0) from additional versions', async () => {
    const mockVersions: Partial<TrackWithVersions>[] = [
      { id: 'v0', sourceVersionNumber: 0, audio_url: 'url' },
      { id: 'v1', sourceVersionNumber: 1, audio_url: 'url' },
    ];
    mockedGetTrackWithVersions.mockResolvedValue(mockVersions as TrackWithVersions[]);

    const { result } = renderHook(() => useTrackVersions('test-track-id'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.additionalVersionCount).toBe(1);
    expect(result.current.versions.length).toBe(1);
    expect(result.current.versions[0]?.id).toBe('v1');
  });

  it('should return true for hasVersions when additional versions exist', async () => {
    const mockVersions: Partial<TrackWithVersions>[] = [
      { id: 'v0', sourceVersionNumber: 0, audio_url: 'url' },
      { id: 'v1', sourceVersionNumber: 1, audio_url: 'url' },
    ];
    mockedGetTrackWithVersions.mockResolvedValue(mockVersions as TrackWithVersions[]);

    const { result } = renderHook(() => useTrackVersions('test-track-id'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasVersions).toBe(true);
  });

  it('should return false for hasVersions when no additional versions exist', async () => {
    const mockVersions: Partial<TrackWithVersions>[] = [
      { id: 'v0', sourceVersionNumber: 0, audio_url: 'url' },
    ];
    mockedGetTrackWithVersions.mockResolvedValue(mockVersions as TrackWithVersions[]);

    const { result } = renderHook(() => useTrackVersions('test-track-id'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasVersions).toBe(false);
    expect(result.current.additionalVersionCount).toBe(0);
  });

  it('should handle empty versions array from API', async () => {
    mockedGetTrackWithVersions.mockResolvedValue([]);

    const { result } = renderHook(() => useTrackVersions('test-track-id'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hasVersions).toBe(false);
    expect(result.current.additionalVersionCount).toBe(0);
    expect(result.current.allVersions).toEqual([]);
  });

  it('should not fetch versions if trackId is null or undefined', () => {
    const { result } = renderHook(() => useTrackVersions(null));
    expect(mockedGetTrackWithVersions).not.toHaveBeenCalled();
    expect(result.current.hasVersions).toBe(false);
    expect(result.current.allVersions).toEqual([]);
  });
});
