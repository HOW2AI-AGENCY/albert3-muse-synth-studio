import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTrackVersions } from '@/features/tracks/hooks';

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
    { id: 'v1', versionNumber: 0, title: 'Main', audio_url: 'main.mp3', isMasterVersion: true },
    { id: 'v2', versionNumber: 1, title: 'Alt', audio_url: 'alt.mp3', isMasterVersion: false },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    trackVersionMocks.getTrackWithVersions.mockResolvedValue(sampleVersions);
    trackVersionMocks.getMasterVersion.mockReturnValue(sampleVersions[0]);
    trackVersionMocks.hasMultipleVersions.mockReturnValue(true);
  });

  it('loads versions automatically when trackId is provided', async () => {
    const { result } = renderHook(() => useTrackVersions('track-1'));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(trackVersionMocks.getTrackWithVersions).toHaveBeenCalledWith('track-1');
    expect(result.current.versions).toEqual(sampleVersions);
    expect(result.current.masterVersion).toEqual(sampleVersions[0]);
    expect(result.current.hasVersions).toBe(true);
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

    expect(result.current.error).toBe(error);
    expect(loggerMocks.logError).toHaveBeenCalled();
  });
});
