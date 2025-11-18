// src/services/generation/__tests__/GenerationService.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GenerationService } from '../GenerationService';
import { supabase } from '@/integrations/supabase/client';

// Mock the logger to prevent console noise
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('GenerationService', () => {
  beforeEach(() => {
    // Reset internal state of the service
    GenerationService['pendingRequests'].clear();
  });

  afterEach(() => {
    // Clear all mock history and implementations
    vi.clearAllMocks();
  });

  describe('Request Deduplication', () => {
    it('should return the same promise for identical duplicate requests', async () => {
      const request = {
        provider: 'suno' as const,
        prompt: 'A beautiful synthwave track',
        modelVersion: 'v3.5',
      };

      // Mock the invoke function to resolve successfully
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, trackId: 'track-123' },
        error: null,
      });

      const promise1 = GenerationService.generate(request);
      const promise2 = GenerationService.generate(request);

      expect(promise1).toBe(promise2);
      // Ensure the function was only called once
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(1);
    });

    it('should treat requests with different idempotency keys as unique', async () => {
      const request1 = {
        provider: 'suno' as const,
        prompt: 'A beautiful synthwave track',
        idempotencyKey: 'key-1',
      };
      const request2 = {
        ...request1,
        idempotencyKey: 'key-2',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, trackId: 'track-123' },
        error: null,
      });

      const promise1 = GenerationService.generate(request1);
      const promise2 = GenerationService.generate(request2);

      expect(promise1).not.toBe(promise2);
      expect(supabase.functions.invoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('Provider Routing', () => {
    it('should call the "generate-suno" edge function for the suno provider', async () => {
      const request = {
        provider: 'suno' as const,
        prompt: 'Dark ambient music',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, trackId: 'track-suno-123' },
        error: null,
      });

      await GenerationService.generate(request);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-suno', {
        body: request,
      });
    });

    it('should call the "generate-mureka" edge function for the mureka provider', async () => {
      const request = {
        provider: 'mureka' as const,
        prompt: 'Lofi hip-hop beats',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: true, trackId: 'track-mureka-123' },
        error: null,
      });

      await GenerationService.generate(request);

      expect(supabase.functions.invoke).toHaveBeenCalledWith('generate-mureka', {
        body: request,
      });
    });
  });

  describe('Error Handling', () => {
    it('should return a failed result when the edge function invocation errors', async () => {
      const request = { provider: 'suno' as const, prompt: 'Test' };
      const errorMessage = 'Internal Server Error';

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: { message: errorMessage },
      });

      const result = await GenerationService.generate(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe(errorMessage);
      expect(result.trackId).toBe('');
    });

    it('should return a failed result when the edge function reports failure', async () => {
      const request = { provider: 'suno' as const, prompt: 'Test' };
      const failureReason = 'Insufficient credits';

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { success: false, error: failureReason },
        error: null,
      });

      const result = await GenerationService.generate(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe(failureReason);
    });
  });
});