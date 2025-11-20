import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BalanceService } from '../balance.service';
import { SupabaseFunctions } from '@/integrations/supabase/functions';
import { supabase } from '@/integrations/supabase/client';

// Mock dependencies
vi.mock('@/integrations/supabase/functions', () => ({
  SupabaseFunctions: {
    invoke: vi.fn(),
  },
}));
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

describe('BalanceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProviderBalance', () => {
    it('should call the get-balance function for a provider', async () => {
      (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
      const mockResponse = { provider: 'suno', balance: 1000 };
      (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({ data: mockResponse, error: null });

      const response = await BalanceService.getProviderBalance('suno');

      expect(SupabaseFunctions.invoke).toHaveBeenCalledWith('get-balance', { body: { provider: 'suno' } });
      expect(response).toEqual(mockResponse);
    });

    it('should return unauthorized if no session is available', async () => {
      (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: null } });

      const response = await BalanceService.getProviderBalance('suno');

      expect(SupabaseFunctions.invoke).not.toHaveBeenCalled();
      expect(response.error).toContain('Unauthorized');
    });

    it('should return an error object if the function fails', async () => {
      (supabase.auth.getSession as vi.Mock).mockResolvedValue({ data: { session: { access_token: 'test-token' } } });
      (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({
          data: null,
          error: { message: 'Function Error' }
        });

      const response = await BalanceService.getProviderBalance('suno');

      expect(response.error).toContain('Function Error');
    });
  });
});
