/**
 * Unit Tests for useAIImproveField Hook
 * @version 1.0.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAIImproveField } from '@/hooks/useAIImproveField';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useAIImproveField', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initial State', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useAIImproveField());

      expect(result.current.isImproving).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.improveField).toBe('function');
    });
  });

  describe('improveField Function', () => {
    it('should successfully improve field with valid params', async () => {
      const mockResult = {
        success: true,
        result: 'Improved prompt text',
        action: 'improve',
        field: 'prompt',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResult,
        error: null,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useAIImproveField({ onSuccess }));

      await result.current.improveField({
        field: 'prompt',
        value: 'Original prompt',
        action: 'improve',
      });

      await waitFor(() => {
        expect(result.current.isImproving).toBe(false);
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('ai-improve-field', {
        body: {
          field: 'prompt',
          value: 'Original prompt',
          action: 'improve',
          context: undefined,
          additionalContext: undefined,
        },
      });

      expect(onSuccess).toHaveBeenCalledWith('Improved prompt text');
    });

    it('should handle generate action', async () => {
      const mockResult = {
        success: true,
        result: 'Generated new prompt',
        action: 'generate',
        field: 'prompt',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResult,
        error: null,
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useAIImproveField({ onSuccess }));

      await result.current.improveField({
        field: 'prompt',
        value: '',
        action: 'generate',
        context: 'Electronic music',
      });

      await waitFor(() => {
        expect(result.current.isImproving).toBe(false);
      });

      expect(onSuccess).toHaveBeenCalledWith('Generated new prompt');
    });

    it('should handle rewrite action with additional context', async () => {
      const mockResult = {
        success: true,
        result: 'Rewritten lyrics',
        action: 'rewrite',
        field: 'lyrics',
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResult,
        error: null,
      });

      const { result } = renderHook(() => useAIImproveField());

      await result.current.improveField({
        field: 'lyrics',
        value: 'Original lyrics',
        action: 'rewrite',
        additionalContext: { genre: 'rock', mood: 'energetic' },
      });

      await waitFor(() => {
        expect(result.current.isImproving).toBe(false);
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith('ai-improve-field', {
        body: {
          field: 'lyrics',
          value: 'Original lyrics',
          action: 'rewrite',
          context: undefined,
          additionalContext: { genre: 'rock', mood: 'energetic' },
        },
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockError = new Error('AI API error');

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: mockError,
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useAIImproveField({ onError }));

      await result.current.improveField({
        field: 'prompt',
        value: 'Test',
        action: 'improve',
      });

      await waitFor(() => {
        expect(result.current.isImproving).toBe(false);
      });

      expect(result.current.error).toBe('AI API error');
      expect(onError).toHaveBeenCalledWith('AI API error');
    });

    it('should handle network errors', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValueOnce(
        new Error('Network error')
      );

      const onError = vi.fn();
      const { result } = renderHook(() => useAIImproveField({ onError }));

      await result.current.improveField({
        field: 'title',
        value: 'Test',
        action: 'improve',
      });

      await waitFor(() => {
        expect(result.current.isImproving).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(onError).toHaveBeenCalled();
    });

    it('should set isImproving state correctly during operation', async () => {
      vi.mocked(supabase.functions.invoke).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => {
              resolve({
                data: { success: true, result: 'Result' },
                error: null,
              });
            }, 100);
          })
      );

      const { result } = renderHook(() => useAIImproveField());

      expect(result.current.isImproving).toBe(false);

      const promise = result.current.improveField({
        field: 'prompt',
        value: 'Test',
        action: 'improve',
      });

      await waitFor(() => {
        expect(result.current.isImproving).toBe(true);
      });

      await promise;

      await waitFor(() => {
        expect(result.current.isImproving).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should clear previous errors on new request', async () => {
      // First request fails
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error('First error'),
      });

      const { result } = renderHook(() => useAIImproveField());

      await result.current.improveField({
        field: 'prompt',
        value: 'Test',
        action: 'improve',
      });

      await waitFor(() => {
        expect(result.current.error).toBe('First error');
      });

      // Second request succeeds
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true, result: 'Success' },
        error: null,
      });

      await result.current.improveField({
        field: 'prompt',
        value: 'Test',
        action: 'improve',
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
    });
  });

  describe('Callbacks', () => {
    it('should not call onSuccess callback on error', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error('Test error'),
      });

      const onSuccess = vi.fn();
      const { result } = renderHook(() => useAIImproveField({ onSuccess }));

      await result.current.improveField({
        field: 'prompt',
        value: 'Test',
        action: 'improve',
      });

      await waitFor(() => {
        expect(result.current.isImproving).toBe(false);
      });

      expect(onSuccess).not.toHaveBeenCalled();
    });

    it('should not call onError callback on success', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: { success: true, result: 'Success' },
        error: null,
      });

      const onError = vi.fn();
      const { result } = renderHook(() => useAIImproveField({ onError }));

      await result.current.improveField({
        field: 'prompt',
        value: 'Test',
        action: 'improve',
      });

      await waitFor(() => {
        expect(result.current.isImproving).toBe(false);
      });

      expect(onError).not.toHaveBeenCalled();
    });
  });
});
