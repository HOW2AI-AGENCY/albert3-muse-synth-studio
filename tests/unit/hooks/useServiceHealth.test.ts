/**
 * Unit Tests: useServiceHealth Hook
 * TEST-006: Service health monitoring
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '../test-utils';
import { useServiceHealth } from '@/hooks/useServiceHealth';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client');

describe('useServiceHealth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default health status', () => {
    const { result } = renderHook(() => useServiceHealth());

    expect(result.current.health).toEqual({
      suno: 'unknown',
      mureka: 'unknown',
      database: 'unknown',
      storage: 'unknown',
    });
    expect(result.current.isHealthy).toBe(true);
  });

  it('should check health on mount', async () => {
    vi.mocked(supabase.functions.invoke).mockImplementation(() =>
      Promise.resolve({
        data: { status: 'healthy', balance: 1000 },
        error: null,
      })
    );

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.health.suno).toBe('healthy');
      expect(result.current.health.database).toBe('healthy');
    });
  });

  it('should mark service as unhealthy on error', async () => {
    vi.mocked(supabase.functions.invoke).mockImplementation(() =>
      Promise.resolve({
        data: null,
        error: new Error('Service unavailable'),
      })
    );

    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.health.suno).toBe('unhealthy');
      expect(result.current.isHealthy).toBe(false);
    });
  });

  it('should poll health status periodically', async () => {
    vi.mocked(supabase.functions.invoke).mockImplementation(() =>
      Promise.resolve({
        data: { status: 'healthy' },
        error: null,
      })
    );

    renderHook(() => useServiceHealth({ pollingInterval: 30000 }));

    // Initial check
    expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledTimes(2); // suno + mureka

    // Fast-forward 30 seconds
    vi.advanceTimersByTime(30000);

    await waitFor(() => {
      expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalledTimes(4); // +2 checks
    });
  });

  it('should retry failed health checks', async () => {
    let callCount = 0;

    vi.mocked(supabase.functions.invoke).mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        return Promise.resolve({ data: null, error: new Error('Timeout') });
      }
      return Promise.resolve({ data: { status: 'healthy' }, error: null });
    });

    const { result } = renderHook(() => useServiceHealth({ retryAttempts: 3 }));

    await waitFor(() => {
      expect(result.current.health.suno).toBe('healthy');
      expect(callCount).toBeGreaterThan(2);
    });
  });

  it('should aggregate overall health status', async () => {
    vi.mocked(supabase.functions.invoke).mockImplementation((name) => {
      if (name === 'get-balance') {
        return Promise.resolve({ data: { status: 'healthy' }, error: null });
      }
      return Promise.resolve({ data: null, error: new Error('Service down') });
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.health.suno).toBe('healthy');
      expect(result.current.health.mureka).toBe('unhealthy');
      expect(result.current.isHealthy).toBe(false); // At least one unhealthy
    });
  });

  it('should expose manual refresh function', async () => {
    vi.mocked(supabase.functions.invoke).mockImplementation(() =>
      Promise.resolve({
        data: { status: 'healthy' },
        error: null,
      })
    );

    const { result } = renderHook(() => useServiceHealth());

    // Clear previous calls
    vi.clearAllMocks();

    // Manual refresh
    await result.current.refreshHealth();

    await waitFor(() => {
      expect(vi.mocked(supabase.functions.invoke)).toHaveBeenCalled();
    });
  });

  it('should handle database connection check', async () => {
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: new Error('Connection failed') }),
    } as any);

    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.health.database).toBe('unhealthy');
    });
  });

  it('should track last check timestamp', async () => {
    vi.mocked(supabase.functions.invoke).mockImplementation(() =>
      Promise.resolve({
        data: { status: 'healthy' },
        error: null,
      })
    );

    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.lastCheck).toBeTruthy();
      expect(result.current.lastCheck).toBeInstanceOf(Date);
    });
  });

  it('should set isHealthy to false when one service is unhealthy', async () => {
    vi.mocked(supabase.functions.invoke).mockImplementation((name) => {
      if (name === 'get-balance') {
        return Promise.resolve({
          data: { status: 'healthy' },
          error: null,
        });
      }
      return Promise.resolve({
        data: null,
        error: new Error('Service down'),
      });
    });

    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    } as any);

    const { result } = renderHook(() => useServiceHealth());

    await waitFor(() => {
      expect(result.current.health.suno).toBe('healthy');
      expect(result.current.health.mureka).toBe('unhealthy');
      expect(result.current.isHealthy).toBe(false);
    });
  });
});
