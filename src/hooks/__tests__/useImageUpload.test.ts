import { renderHook, act, waitFor } from '@testing-library/react';
import { useImageUpload } from '../useImageUpload';
import { vi } from 'vitest';

// Mock dependencies
const mockUpload = vi.fn();
const mockGetPublicUrl = vi.fn();
const mockToast = vi.fn();

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-user-id' } } }),
    },
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
      })),
    },
  },
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// Mock logger to suppress console output during tests
vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));


describe('useImageUpload', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
    // Mock successful URL retrieval by default
    mockGetPublicUrl.mockReturnValue({ data: { publicUrl: 'https://test.com/image.png' } });
  });

  it('should successfully upload a valid image', async () => {
    mockUpload.mockResolvedValue({ error: null });
    const onUploadSuccess = vi.fn();

    const { result } = renderHook(() => useImageUpload({ onUploadSuccess }));

    const file = new File(['(⌐□_□)'], 'chucknorris.png', { type: 'image/png' });

    let uploadResult: string | null = null;
    await act(async () => {
      // The hook's internal `handleFileChange` calls `uploadImage`
      // We can simulate this by directly calling a similar function
      const fileChangeEvent = { target: { files: [file] } } as React.ChangeEvent<HTMLInputElement>;
      await result.current.handleFileChange(fileChangeEvent);
    });

    await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
    });

    expect(mockUpload).toHaveBeenCalledWith(expect.any(String), file, expect.any(Object));
    expect(onUploadSuccess).toHaveBeenCalledWith('https://test.com/image.png');
    expect(result.current.previewUrl).not.toBeNull();
    expect(result.current.fileName).toBe('chucknorris.png');
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ title: 'Image Uploaded' }));
  });

  it('should reject files with invalid type', async () => {
    const { result } = renderHook(() => useImageUpload());
    const file = new File(['some text'], 'document.txt', { type: 'text/plain' });

    await act(async () => {
      const fileChangeEvent = { target: { files: [file] } } as React.ChangeEvent<HTMLInputElement>;
      await result.current.handleFileChange(fileChangeEvent);
    });

    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: 'Invalid File Type' }));
    expect(result.current.previewUrl).toBeNull();
  });

  it('should reject files that are too large', async () => {
    const { result } = renderHook(() => useImageUpload());
    const largeFile = new File(['a'.repeat(6 * 1024 * 1024)], 'large.png', { type: 'image/png' });

    await act(async () => {
      const fileChangeEvent = { target: { files: [largeFile] } } as React.ChangeEvent<HTMLInputElement>;
      await result.current.handleFileChange(fileChangeEvent);
    });

    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: 'File Too Large' }));
    expect(result.current.previewUrl).toBeNull();
  });

  it('should handle Supabase upload errors gracefully', async () => {
    const uploadError = new Error('Supabase upload failed');
    mockUpload.mockResolvedValue({ error: uploadError });

    const { result } = renderHook(() => useImageUpload());
    const file = new File(['(⌐□_□)'], 'image.png', { type: 'image/png' });

    await act(async () => {
      const fileChangeEvent = { target: { files: [file] } } as React.ChangeEvent<HTMLInputElement>;
      await result.current.handleFileChange(fileChangeEvent);
    });

    await waitFor(() => {
        expect(result.current.isUploading).toBe(false);
    });

    expect(mockToast).toHaveBeenCalledWith(expect.objectContaining({ variant: 'destructive', title: 'Upload Failed' }));
    // The preview should be cleared on failure
    expect(result.current.previewUrl).toBeNull();
  });
});
