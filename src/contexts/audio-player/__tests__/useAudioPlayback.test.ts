import { renderHook, act, waitFor } from '@testing-library/react';
import { useAudioPlayback } from '../useAudioPlayback';
import { AudioPlayerTrack } from '@/types/track';
import { vi } from 'vitest';

// Mock dependencies
vi.mock('@/utils/logger', () => ({
  logInfo: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('@/utils/serviceWorker', () => ({
  cacheAudioFile: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

const createMockTrack = (id: string): AudioPlayerTrack => ({
  id,
  title: `Test Track ${id}`,
  audio_url: `https://example.com/audio-${id}.mp3`,
  status: 'completed',
});

describe('useAudioPlayback critical fixes', () => {
  beforeEach(() => {
    // Mock HTMLAudioElement
    global.HTMLAudioElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    global.HTMLAudioElement.prototype.pause = vi.fn();
    global.HTMLAudioElement.prototype.load = vi.fn();
    Object.defineProperty(global.HTMLAudioElement.prototype, 'readyState', {
      writable: true,
      value: 4, // HAVE_ENOUGH_DATA
    });
  });

  it('should prevent AbortError via guard clause', async () => {
    const { result } = renderHook(() => useAudioPlayback());
    
    const track1 = createMockTrack('1');
    const track2 = createMockTrack('2');
    
    // ✅ Два быстрых вызова playTrack
    const promise1 = act(() => result.current.playTrack(track1));
    const promise2 = act(() => result.current.playTrack(track2)); // Должен игнорироваться
    
    await promise1;
    await promise2;
    
    // ✅ Только первый трек должен воспроизводиться
    expect(result.current.currentTrack?.id).toBe('1');
  });

  it('should not throw NotSupportedError on togglePlayPause without src', () => {
    const { result } = renderHook(() => useAudioPlayback());
    
    // ✅ Попытка play без загруженного трека
    expect(() => {
      act(() => {
        result.current.togglePlayPause();
      });
    }).not.toThrow();
    
    // ✅ Трек не должен воспроизводиться
    expect(result.current.isPlaying).toBe(false);
  });

  it('should abort previous playTrack call when new one is initiated', async () => {
    const { result } = renderHook(() => useAudioPlayback());
    
    const track1 = createMockTrack('1');
    const track2 = createMockTrack('2');
    
    // Начинаем воспроизведение track1
    const promise1 = act(() => result.current.playTrack(track1));
    
    // Быстро переключаемся на track2
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });
    
    const promise2 = act(() => result.current.playTrack(track2));
    
    await promise1;
    await promise2;
    
    // ✅ Должен воспроизводиться только track2
    await waitFor(() => {
      expect(result.current.currentTrack?.id).toBe('2');
    });
  });

  it('should validate audio URL format', async () => {
    const { result } = renderHook(() => useAudioPlayback());
    
    const invalidTrack: AudioPlayerTrack = {
      id: '1',
      title: 'Invalid Track',
      audio_url: 'https://example.com/not-audio.txt',
      status: 'completed',
    };
    
    await act(async () => {
      await result.current.playTrack(invalidTrack);
    });
    
    // ✅ Трек не должен быть установлен
    expect(result.current.currentTrack).toBeNull();
  });

  it('should handle empty audio URL', async () => {
    const { result } = renderHook(() => useAudioPlayback());
    
    const emptyTrack: AudioPlayerTrack = {
      id: '1',
      title: 'Empty Track',
      audio_url: '',
      status: 'completed',
    };
    
    await act(async () => {
      await result.current.playTrack(emptyTrack);
    });
    
    // ✅ Трек не должен быть установлен
    expect(result.current.currentTrack).toBeNull();
  });
});
