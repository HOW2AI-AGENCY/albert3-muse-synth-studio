/**
 * useAIProjectCreation Hook Tests
 * Week 1, Phase 1.2 - React Hooks Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useAIProjectCreation } from '@/hooks/useAIProjectCreation';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

describe('useAIProjectCreation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('AI concept generation', () => {
    it('should generate project concept successfully', async () => {
      const mockResponse = {
        name: 'Synthwave Dreams',
        genre: 'Synthwave',
        mood: 'Nostalgic',
        concept: 'A journey through 80s nostalgia',
        plannedTracks: [
          { title: 'Neon Nights', description: 'Opening track' },
          { title: 'Digital Sunset', description: 'Mid-tempo groove' },
        ],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useAIProjectCreation());

      expect(result.current.isGenerating).toBe(false);
      expect(result.current.aiSuggestions).toBeNull();

      let conceptResult: any;
      await act(async () => {
        conceptResult = await result.current.generateConcept(
          'Create a synthwave album'
        );
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(conceptResult).toEqual(mockResponse);
      expect(result.current.aiSuggestions).toEqual(mockResponse);
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('AI concept generated')
      );
    });

    it('should handle generation error', async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: null,
        error: new Error('AI generation failed'),
      });

      const { result } = renderHook(() => useAIProjectCreation());

      let conceptResult: any;
      await act(async () => {
        conceptResult = await result.current.generateConcept('Test prompt');
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(conceptResult).toBeNull();
      expect(toast.error).toHaveBeenCalled();
    });

    it('should handle network error', async () => {
      vi.mocked(supabase.functions.invoke).mockRejectedValue(
        new Error('Network error')
      );

      const { result } = renderHook(() => useAIProjectCreation());

      await act(async () => {
        await result.current.generateConcept('Test prompt');
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });

  describe('Suggestions management', () => {
    it('should clear suggestions', async () => {
      const mockResponse = {
        name: 'Test Project',
        genre: 'Electronic',
        mood: 'Energetic',
        concept: 'Test concept',
        plannedTracks: [],
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: mockResponse,
        error: null,
      });

      const { result } = renderHook(() => useAIProjectCreation());

      // Generate concept first
      await act(async () => {
        await result.current.generateConcept('Test prompt');
      });

      await waitFor(() => {
        expect(result.current.aiSuggestions).toEqual(mockResponse);
      });

      // Clear suggestions
      act(() => {
        result.current.clearSuggestions();
      });

      expect(result.current.aiSuggestions).toBeNull();
    });
  });

  describe('Loading states', () => {
    it('should set isGenerating to true during generation', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(supabase.functions.invoke).mockReturnValue(promise as any);

      const { result } = renderHook(() => useAIProjectCreation());

      expect(result.current.isGenerating).toBe(false);

      act(() => {
        result.current.generateConcept('Test prompt');
      });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(true);
      });

      resolvePromise({ data: { name: 'Test' }, error: null });

      await waitFor(() => {
        expect(result.current.isGenerating).toBe(false);
      });
    });
  });

  describe('Edge cases', () => {
    it('should handle empty prompt', async () => {
      const { result } = renderHook(() => useAIProjectCreation());

      await act(async () => {
        await result.current.generateConcept('');
      });

      // Should still call the function (validation is handled by Edge Function)
      expect(supabase.functions.invoke).toHaveBeenCalled();
    });

    it('should handle very long prompt', async () => {
      const longPrompt = 'A'.repeat(5000);

      vi.mocked(supabase.functions.invoke).mockResolvedValue({
        data: { name: 'Test' },
        error: null,
      });

      const { result } = renderHook(() => useAIProjectCreation());

      await act(async () => {
        await result.current.generateConcept(longPrompt);
      });

      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        'generate-project-concept',
        { body: { prompt: longPrompt } }
      );
    });
  });
});
