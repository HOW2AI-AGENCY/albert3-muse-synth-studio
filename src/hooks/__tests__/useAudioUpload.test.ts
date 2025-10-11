import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAudioUpload } from '../useAudioUpload';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
      })),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useAudioUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should reject files larger than 20MB', async () => {
    const { result } = renderHook(() => useAudioUpload());

    const largeFile = new File(['x'.repeat(21 * 1024 * 1024)], 'large.mp3', {
      type: 'audio/mpeg',
    });

    await expect(result.current.uploadAudio(largeFile)).rejects.toThrow(
      'File size must be less than 20MB'
    );
  });

  it('should reject non-audio files', async () => {
    const { result } = renderHook(() => useAudioUpload());

    const textFile = new File(['text'], 'file.txt', { type: 'text/plain' });

    await expect(result.current.uploadAudio(textFile)).rejects.toThrow(
      'Only audio files are allowed'
    );
  });

  it('should upload valid audio file', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      data: { path: 'reference-audio/test.mp3' },
      error: null,
    });

    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: 'https://example.com/test.mp3' },
    });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    } as any);

    const { result } = renderHook(() => useAudioUpload());

    const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });

    const url = await result.current.uploadAudio(audioFile);

    expect(url).toBe('https://example.com/test.mp3');
    expect(mockUpload).toHaveBeenCalled();
  });

  it('should handle upload errors', async () => {
    const mockUpload = vi.fn().mockResolvedValue({
      data: null,
      error: new Error('Upload failed'),
    });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAudioUpload());

    const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });

    await expect(result.current.uploadAudio(audioFile)).rejects.toThrow();
  });
});
