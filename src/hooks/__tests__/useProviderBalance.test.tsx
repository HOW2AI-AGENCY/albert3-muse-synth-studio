import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SupabaseFunctions } from '@/integrations/supabase/functions';
import { useProviderBalance } from '../useProviderBalance';

import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/functions', () => ({
  SupabaseFunctions: {
    invoke: vi.fn(),
  },
}));

vi.mock('@/integrations/supabase/client', async () => {
  const actual = await vi.importActual('@/integrations/supabase/client');
  return {
    ...actual,
    supabase: {
      ...actual.supabase,
      auth: {
        ...actual.supabase.auth,
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              access_token: 'test-token',
            },
          },
        }),
      },
    },
  };
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useProviderBalance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('should call invoke with GET method and query parameter', async () => {
    const mockData = {
      provider: 'suno',
      balance: 100,
      currency: 'credits',
    };
    const mockedInvoke = vi.mocked(SupabaseFunctions.invoke);
    mockedInvoke.mockResolvedValue({ data: mockData, error: null });

    const { result } = renderHook(() => useProviderBalance(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockedInvoke).toHaveBeenCalledTimes(1);
    expect(mockedInvoke).toHaveBeenCalledWith(
      'get-balance?provider=suno',
      { method: 'GET' }
    );
  });
});
