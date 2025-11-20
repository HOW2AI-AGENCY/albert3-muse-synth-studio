import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LyricsService } from '../lyrics.service';
import { SupabaseFunctions } from '@/integrations/supabase/functions';

// Mock the SupabaseFunctions wrapper
vi.mock('@/integrations/supabase/functions', () => ({
  SupabaseFunctions: {
    invoke: vi.fn(),
  },
}));

describe('LyricsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateLyrics', () => {
    it('should call the generate-lyrics function', async () => {
      const mockResponse = { success: true, jobId: 'job-123' };
      (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({ data: mockResponse, error: null });

      const request = { prompt: 'Test lyrics prompt' };
      const response = await LyricsService.generateLyrics(request);

      expect(SupabaseFunctions.invoke).toHaveBeenCalledWith('generate-lyrics', { body: request });
      expect(response).toEqual(mockResponse);
    });

    it('should return an error object if the function fails', async () => {
        (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({
            data: null,
            error: { message: 'Function Error' }
        });

        const request = { prompt: 'Test lyrics prompt' };
        const response = await LyricsService.generateLyrics(request);

        expect(response.success).toBe(false);
        expect(response.error).toContain('Function Error');
    });
  });
});
