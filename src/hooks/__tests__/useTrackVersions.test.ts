import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTrackVersions, resetTrackVersionsCache } from '@/features/tracks/hooks';

const loggerMocks = vi.hoisted(() => ({ logInfo: vi.fn(), logError: vi.fn() }));
vi.mock('@/utils/logger', () => ({
  logInfo: (...args: unknown[]) => loggerMocks.logInfo(...args),
  logError: (...args: unknown[]) => loggerMocks.logError(...args),
}));

const trackVersionMocks = vi.hoisted(() => ({
  getTrackWithVersions: vi.fn(),
  getMasterVersion: vi.fn(),
  hasMultipleVersions: vi.fn(),
}));

vi.mock('@/features/tracks/api/trackVersions', () => trackVersionMocks);

describe('useTrackVersions', () => {
  const sampleVersions = [
    { id: 'track-1', isOriginal: true, isMasterVersion: true, title: 'Main', audio_url: 'main.mp3' },
    { id: 'v2', isOriginal: false, isMasterVersion: false, title: 'Alt', audio_url: 'alt.mp3' },
  ] as any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetTrackVersionsCache();
    trackVersionMocks.getTrackWithVersions.mockResolvedValue(sampleVersions);
    trackVersionMocks.getMasterVersion.mockReturnValue(sampleVersions[0]);
    trackVersionMocks.hasMultipleVersions.mockReturnValue(true);
  });

  it('loads versions automatically when trackId is provided', async () => {
    const { result } = renderHook(() => useTrackVersions('track-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(trackVersionMocks.getTrackWithVersions).toHaveBeenCalledWith('track-1');
    expect(result.current.allVersions).toEqual(sampleVersions);
    expect(result.current.versions).toEqual([sampleVersions[1]]);
    expect(result.current.masterVersion).toEqual(sampleVersions[0]);
    expect(result.current.mainVersion).toEqual(sampleVersions[0]);
    expect(result.current.totalVersionCount).toBe(2);
    expect(result.current.hasVersions).toBe(true);
    expect(result.current.versionCount).toBe(1);
    expect(result.current.additionalVersionCount).toBe(1);
  });

  it('resets state when trackId is missing', async () => {
    const { result } = renderHook(() => useTrackVersions(null));

    await act(async () => {
      await result.current.loadVersions();
    });

    expect(trackVersionMocks.getTrackWithVersions).not.toHaveBeenCalled();
    expect(result.current.versions).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('captures errors from the loader', async () => {
    const error = new Error('failed to load');
    trackVersionMocks.getTrackWithVersions.mockRejectedValueOnce(error);

    const { result } = renderHook(() => useTrackVersions('track-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toEqual(error);
    expect(loggerMocks.logError).toHaveBeenCalled();
  });
});
