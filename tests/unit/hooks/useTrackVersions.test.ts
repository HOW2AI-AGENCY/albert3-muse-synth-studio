/**
 * Unit Tests: useTrackVersions Hook
 * TEST-006: React Hooks Unit Tests (continued)
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTrackVersions } from '@/features/tracks/hooks/useTrackVersions';

describe('useTrackVersions', () => {
  it('should count additional versions correctly', () => {
    const mockVersions = [
      { variant_index: 1, is_primary_variant: false },
      { variant_index: 2, is_primary_variant: false },
      { variant_index: 3, is_primary_variant: false },
    ];

    const { result } = renderHook(() =>
      useTrackVersions({ versions: mockVersions as any })
    );

    expect(result.current.getAdditionalVersionsCount(mockVersions as any)).toBe(3);
  });

  it('should filter out variant_index 0', () => {
    const mockVersions = [
      { variant_index: 0, is_primary_variant: true },
      { variant_index: 1, is_primary_variant: false },
    ];

    const { result } = renderHook(() =>
      useTrackVersions({ versions: mockVersions as any })
    );

    expect(result.current.getAdditionalVersionsCount(mockVersions as any)).toBe(1);
  });

  it('should return true for hasVersions when versions exist', () => {
    const mockVersions = [
      { variant_index: 1, is_primary_variant: false },
    ];

    const { result } = renderHook(() =>
      useTrackVersions({ versions: mockVersions as any })
    );

    expect(result.current.hasVersions).toBe(true);
  });

  it('should return false for hasVersions when no additional versions', () => {
    const mockVersions = [
      { variant_index: 0, is_primary_variant: true },
    ];

    const { result } = renderHook(() =>
      useTrackVersions({ versions: mockVersions as any })
    );

    expect(result.current.hasVersions).toBe(false);
  });

  it('should handle empty versions array', () => {
    const { result } = renderHook(() =>
      useTrackVersions({ versions: [] })
    );

    expect(result.current.hasVersions).toBe(false);
    expect(result.current.getAdditionalVersionsCount([])).toBe(0);
  });

  it('should handle undefined versions', () => {
    const { result } = renderHook(() =>
      useTrackVersions({ versions: undefined as any })
    );

    expect(result.current.hasVersions).toBe(false);
  });
});
