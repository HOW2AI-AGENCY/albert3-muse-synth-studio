import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAudioUpload } from '../useAudioUpload';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
    from: vi.fn(),
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
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'test-user' } },
      error: null,
    } as any);
  });

  it('should reject files larger than 50MB', async () => {
    const { result } = renderHook(() => useAudioUpload());
    // Mock a large file without creating a large buffer in memory
    const largeFile = {
      name: 'large.mp3',
      type: 'audio/mpeg',
      size: 51 * 1024 * 1024, // 51MB
    } as File;

    // The hook should throw an error with a specific message
    await expect(result.current.uploadAudio(largeFile)).rejects.toThrow('File size must be less than 50MB');
  });

  it('should reject non-audio files', async () => {
    const { result } = renderHook(() => useAudioUpload());
    const textFile = new File(['text'], 'file.txt', { type: 'text/plain' });

    await expect(result.current.uploadAudio(textFile)).rejects.toThrow('Only audio files are allowed');
  });

  it('should upload valid audio file', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'reference-audio/test.mp3' }, error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test.mp3' } });

    // Correctly mock the chained DB call
    const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'new-library-id' }, error: null });
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    } as any);

    vi.mocked(supabase.from).mockReturnValue({
      insert: mockInsert,
    } as any);

    const { result } = renderHook(() => useAudioUpload());
    const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });

    const { publicUrl, libraryId } = await result.current.uploadAudio(audioFile);

    expect(publicUrl).toBe('https://example.com/test.mp3');
    expect(libraryId).toBe('new-library-id');
    expect(mockUpload).toHaveBeenCalled();
    expect(mockInsert).toHaveBeenCalled();
    expect(mockSelect).toHaveBeenCalled();
    expect(mockSingle).toHaveBeenCalled();
  });

  it('should handle upload errors', async () => {
    const mockUpload = vi.fn().mockResolvedValue({ data: null, error: new Error('Upload failed') });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn(),
    } as any);

    const { result } = renderHook(() => useAudioUpload());
    const audioFile = new File(['audio'], 'test.mp3', { type: 'audio/mpeg' });

    await expect(result.current.uploadAudio(audioFile)).rejects.toThrow('Upload failed');
  });
});
