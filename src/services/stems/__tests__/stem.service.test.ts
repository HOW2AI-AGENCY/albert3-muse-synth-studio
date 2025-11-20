import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StemService } from '../stem.service';
import { SupabaseFunctions } from '@/integrations/supabase/functions';

// Mock the SupabaseFunctions wrapper
vi.mock('@/integrations/supabase/functions', () => ({
  SupabaseFunctions: {
    invoke: vi.fn(),
  },
}));

describe('StemService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('syncStemJob', () => {
    it('should call the sync-stem-job function with correct params', async () => {
      (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({ data: { success: true, code: 200 }, error: null });

      const params = { trackId: 'track-1', taskId: 'task-123' };
      const result = await StemService.syncStemJob(params);

      expect(SupabaseFunctions.invoke).toHaveBeenCalledWith('sync-stem-job', { body: params });
      expect(result).toBe(true);
    });

    it('should return false if the function invocation fails', async () => {
        (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({
            data: null,
            error: { message: 'Invoke Error' }
        });

      const result = await StemService.syncStemJob({ trackId: 'track-1' });

      expect(result).toBe(false);
    });

    it('should return false if the function response indicates failure', async () => {
      (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({ data: { success: false }, error: null });

      const result = await StemService.syncStemJob({ trackId: 'track-1' });

      expect(result).toBe(false);
    });
  });
});
