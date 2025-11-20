import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

// Define types for our mock objects to avoid 'any'
interface MockMediaQueryListEvent {
  matches: boolean;
}

interface MockMediaQueryList {
  matches: boolean;
  media: string;
  addEventListener: (event: 'change', listener: (e: MockMediaQueryListEvent) => void) => void;
  removeEventListener: (event: 'change', listener: (e: MockMediaQueryListEvent) => void) => void;
}

describe('useMediaQuery', () => {
  let matchMediaMock: Mock;

  beforeEach(() => {
    matchMediaMock = vi.fn();
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns true when media query matches', () => {
    const listeners: Array<(e: MockMediaQueryListEvent) => void> = [];
    
    matchMediaMock.mockImplementation((query: string): MockMediaQueryList => ({
      matches: true,
      media: query,
      addEventListener: (_event: 'change', listener: (e: MockMediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
      removeEventListener: (_event: 'change', listener: (e: MockMediaQueryListEvent) => void) => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      },
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('returns false when media query does not match', () => {
    const listeners: Array<(e: MockMediaQueryListEvent) => void> = [];
    
    matchMediaMock.mockImplementation((query: string): MockMediaQueryList => ({
      matches: false,
      media: query,
      addEventListener: (_event: 'change', listener: (e: MockMediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
      removeEventListener: (_event: 'change', listener: (e: MockMediaQueryListEvent) => void) => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      },
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('updates when media query match changes', () => {
    const listeners: Array<(e: MockMediaQueryListEvent) => void> = [];
    let currentMatches = false;

    matchMediaMock.mockImplementation((query: string): MockMediaQueryList => ({
      get matches() { return currentMatches; },
      media: query,
      addEventListener: (_event: 'change', listener: (e: MockMediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
      removeEventListener: (_event: 'change', listener: (e: MockMediaQueryListEvent) => void) => {
        const index = listeners.indexOf(listener);
        if (index > -1) listeners.splice(index, 1);
      },
    }));

    const { result } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    expect(result.current).toBe(false);

    // Simulate media query change
    act(() => {
      currentMatches = true;
      listeners.forEach(listener => listener({ matches: true }));
    });
    
    expect(result.current).toBe(true);
  });

  it('cleans up event listeners on unmount', () => {
    const removeEventListenerSpy = vi.fn();
    const listeners: Array<(e: MockMediaQueryListEvent) => void> = [];

    matchMediaMock.mockImplementation((query: string): MockMediaQueryList => ({
      matches: false,
      media: query,
      addEventListener: (_event: 'change', listener: (e: MockMediaQueryListEvent) => void) => {
        listeners.push(listener);
      },
      removeEventListener: removeEventListenerSpy,
    }));

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 768px)'));
    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalled();
  });
});
