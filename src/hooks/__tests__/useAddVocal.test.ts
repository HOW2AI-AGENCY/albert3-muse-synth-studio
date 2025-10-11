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

  it('should fetch track data before calling create-cover', async () => {
    const mockTrack = {
      audio_url: 'https://example.com/track.mp3',
      title: 'Test Track',
      style_tags: ['rock', 'energetic'],
      prompt: 'energetic rock music'
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTrack, error: null })
        })
      })
    });

    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true, trackId: 'test-id' },
      error: null
    });

    const { result } = renderHook(() => useAddVocal());

    await waitFor(async () => {
      await result.current.addVocal({ 
        trackId: 'test-track-id',
        vocalText: 'Add vocals to this track',
        vocalStyle: 'pop'
      });
    });

    expect(supabase.from).toHaveBeenCalledWith('tracks');
    expect(supabase.functions.invoke).toHaveBeenCalledWith('create-cover', {
      body: expect.objectContaining({
        referenceAudioUrl: mockTrack.audio_url,
        referenceTrackId: 'test-track-id',
        make_instrumental: false
      })
    });
  });

  it('should handle missing track error', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Track not found' }
          })
        })
      })
    });

    const { result } = renderHook(() => useAddVocal());

    await expect(async () => {
      await result.current.addVocal({ trackId: 'non-existent-id' });
    }).rejects.toThrow('Трек не найден или не имеет аудио');
  });

  it('should use create-cover with correct parameters', async () => {
    const mockTrack = {
      audio_url: 'https://example.com/instrumental.mp3',
      title: 'Instrumental Track',
      style_tags: ['electronic'],
      prompt: 'electronic music'
    };

    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: mockTrack, error: null })
        })
      })
    });

    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true },
      error: null
    });

    const { result } = renderHook(() => useAddVocal());

    await waitFor(async () => {
      await result.current.addVocal({ 
        trackId: 'test-id',
        vocalText: 'Custom vocal text',
        vocalStyle: 'jazz'
      });
    });

    expect(supabase.functions.invoke).toHaveBeenCalledWith('create-cover', {
      body: {
        referenceAudioUrl: mockTrack.audio_url,
        referenceTrackId: 'test-id',
        prompt: 'Custom vocal text',
        tags: 'jazz',
        title: 'Instrumental Track (Vocal)',
        make_instrumental: false,
        customMode: true
      }
    });
  });
});
