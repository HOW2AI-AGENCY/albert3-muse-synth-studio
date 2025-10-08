import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  let matchMediaMock: any;

  beforeEach(() => {
    matchMediaMock = vi.fn();
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when media query matches', () => {
    const listeners: Array<(e: any) => void> = [];
    
    matchMediaMock.mockImplementation((query: string) => ({
      matches: true,
      media: query,
      addEventListener: (_event: string, listener: (e: any) => void) => {
        listeners.push(listener);
      },
      removeEventListener: (_event: string, listener: (e: any) => void) => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      },
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('returns false when media query does not match', () => {
    const listeners: Array<(e: any) => void> = [];
    
    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_event: string, listener: (e: any) => void) => {
        listeners.push(listener);
      },
      removeEventListener: (_event: string, listener: (e: any) => void) => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      },
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('updates when media query match changes', () => {
    const listeners: Array<(e: any) => void> = [];
    let currentMatches = false;

    matchMediaMock.mockImplementation((query: string) => ({
      get matches() { return currentMatches; },
      media: query,
      addEventListener: (_event: string, listener: (e: any) => void) => {
        listeners.push(listener);
      },
      removeEventListener: (_event: string, listener: (e: any) => void) => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      },
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    // Simulate media query change
    currentMatches = true;
    listeners.forEach(listener => listener({ matches: true }));
    
    expect(result.current).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.fn();
    const listeners: Array<(e: any) => void> = [];

    matchMediaMock.mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: (_event: string, listener: (e: any) => void) => {
        listeners.push(listener);
      },
      removeEventListener: removeEventListenerSpy,
    }));

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
