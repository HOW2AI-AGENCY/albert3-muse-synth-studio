import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PromptService } from '../prompt.service';
import { SupabaseFunctions } from '@/integrations/supabase/functions';

// Mock the SupabaseFunctions wrapper
vi.mock('@/integrations/supabase/functions', () => ({
  SupabaseFunctions: {
    invoke: vi.fn(),
  },
}));

describe('PromptService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('improvePrompt', () => {
    it('should call the improve-prompt function', async () => {
      const mockResponse = { success: true, improvedPrompt: 'An improved test prompt' };
      (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({ data: mockResponse, error: null });

      const request = { prompt: 'Test prompt' };
      const response = await PromptService.improvePrompt(request);

      expect(SupabaseFunctions.invoke).toHaveBeenCalledWith('improve-prompt', { body: request });
      expect(response).toEqual(mockResponse);
    });

    it('should return an error object if the function fails', async () => {
        (SupabaseFunctions.invoke as vi.Mock).mockResolvedValue({
            data: null,
            error: { message: 'Function Error' }
        });

      const request = { prompt: 'Test prompt' };
      const response = await PromptService.improvePrompt(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('Function Error');
    });
  });
});
