import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSavedLyrics } from '../useSavedLyrics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          data: [
            {
              id: '1',
              title: 'Test Lyrics 1',
              content: '[Verse]\nTest lyrics content',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z',
            },
            {
              id: '2',
              title: 'Test Lyrics 2',
              content: '[Chorus]\nAnother test',
              created_at: '2025-01-02T00:00:00Z',
              updated_at: '2025-01-02T00:00:00Z',
            },
          ],
          error: null,
        })),
      })),
    })),
  })),
};

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

describe('useSavedLyrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch saved lyrics successfully', async () => {
    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.lyrics).toHaveLength(2);
    expect(result.current.lyrics?.[0].title).toBe('Test Lyrics 1');
    expect(result.current.lyrics?.[1].title).toBe('Test Lyrics 2');
  });

  it('should handle loading state', async () => {
    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('should call supabase with correct parameters', async () => {
    renderHook(() => useSavedLyrics(), { wrapper });

    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('saved_lyrics');
    });
  });

  it('should handle error state', async () => {
    const errorSupabase = {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              data: null,
              error: { message: 'Database error' },
            })),
          })),
        })),
      })),
    };

    vi.mocked(mockSupabase.from).mockImplementationOnce(errorSupabase.from as any);

    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBeTruthy();
  });

  it('should return expected hook properties', async () => {
    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current).toHaveProperty('lyrics');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('saveLyrics');
    expect(result.current).toHaveProperty('updateLyrics');
    expect(result.current).toHaveProperty('deleteLyrics');
  });
});
