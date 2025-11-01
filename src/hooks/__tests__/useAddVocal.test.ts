import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAddVocal } from '../useAddVocal';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    functions: {
      invoke: vi.fn()
    }
  }
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

describe('useAddVocal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call add-vocals with correct parameters', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true, taskId: 'test-task-id' },
      error: null
    });

    const { result } = renderHook(() => useAddVocal());

    await waitFor(async () => {
      await result.current.addVocal({ 
        uploadUrl: 'https://example.com/instrumental.mp3',
        prompt: 'Calm piano track with soothing vocals',
        title: 'Test Track (Vocal)',
        negativeTags: 'Heavy Metal',
        style: 'Jazz',
        vocalGender: 'm',
        model: 'V5'
      });
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('add-vocals', {
      body: expect.objectContaining({
        uploadUrl: 'https://example.com/instrumental.mp3',
        prompt: 'Calm piano track with soothing vocals',
        title: 'Test Track (Vocal)',
        negativeTags: 'Heavy Metal',
        style: 'Jazz',
        vocalGender: 'm',
        model: 'V5'
      })
    });
  });

  it('should handle API errors', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { message: 'API error' }
    });

    const { result } = renderHook(() => useAddVocal());

    await expect(
      result.current.addVocal({ 
        uploadUrl: 'https://example.com/audio.mp3',
        prompt: 'test',
        title: 'test',
        negativeTags: 'test',
        style: 'test'
      })
    ).rejects.toThrow();
  });

  it('should include optional parameters when provided', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true, taskId: 'test-task-id' },
      error: null
    });

    const { result } = renderHook(() => useAddVocal());

    await waitFor(async () => {
      await result.current.addVocal({ 
        uploadUrl: 'https://example.com/audio.mp3',
        prompt: 'test prompt',
        title: 'Test Title',
        negativeTags: 'Heavy Metal',
        style: 'Jazz',
        vocalGender: 'f',
        styleWeight: 0.7,
        weirdnessConstraint: 0.3,
        audioWeight: 0.8,
        model: 'V4_5PLUS'
      });
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('add-vocals', {
      body: expect.objectContaining({
        vocalGender: 'f',
        styleWeight: 0.7,
        weirdnessConstraint: 0.3,
        audioWeight: 0.8,
        model: 'V4_5PLUS'
      })
    });
  });
});
