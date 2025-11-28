import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSavedLyrics } from '../useSavedLyrics';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Unmock the global mock from tests/setup.ts to use the local mock
vi.unmock('@/integrations/supabase/client');

// Hoist the entire mock implementation to avoid ReferenceError and correctly mock the chain
const { mockOrder, mockFrom, mockSelect } = vi.hoisted(() => {
  const mockOrder = vi.fn();
  const mockSelect = vi.fn(() => ({ order: mockOrder }));
  const mockFrom = vi.fn(() => ({ select: mockSelect }));
  return { mockOrder, mockSelect, mockFrom };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useSavedLyrics', () => {
  const mockData = [
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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  it('should fetch saved lyrics successfully', async () => {
    mockOrder.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    await waitFor(() => expect(result.current.lyrics).toBeDefined());

    expect(result.current.lyrics).toHaveLength(2);
    expect(result.current.lyrics?.[0].title).toBe('Test Lyrics 1');
  });

  it('should handle loading state', async () => {
    mockOrder.mockResolvedValue({ data: mockData, error: null });
    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it('should call supabase with correct parameters', async () => {
    mockOrder.mockResolvedValue({ data: mockData, error: null });
    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFrom).toHaveBeenCalledWith('saved_lyrics');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('should handle error state', async () => {
    const mockError = new Error('Database error');
    mockOrder.mockResolvedValue({ data: null, error: mockError });

    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toEqual(mockError);
    expect(result.current.lyrics).toBeUndefined();
  });

  it('should return expected hook properties', async () => {
    mockOrder.mockResolvedValue({ data: mockData, error: null });
    const { result } = renderHook(() => useSavedLyrics(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toHaveProperty('lyrics');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('saveLyrics');
    expect(result.current).toHaveProperty('updateLyrics');
    expect(result.current).toHaveProperty('deleteLyrics');
  });
});
