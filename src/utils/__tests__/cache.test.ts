import { describe, it, expect, beforeEach, vi } from 'vitest';
import { cacheAudioFile } from '../serviceWorker';

// Mock Service Worker registration
const mockServiceWorkerRegistration = {
  active: {
    postMessage: vi.fn(),
  },
};

describe('Audio Cache Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      value: {
        ready: Promise.resolve(mockServiceWorkerRegistration),
        controller: {},
      },
      writable: true,
      configurable: true,
    });
  });

  describe('cacheAudioFile', () => {
    it('should send cache message to service worker', async () => {
      const url = 'https://example.com/audio.mp3';
      
      await cacheAudioFile(url);
      
      expect(mockServiceWorkerRegistration.active.postMessage).toHaveBeenCalledWith({
        type: 'CACHE_AUDIO',
        url,
      });
    });

    it('should handle service worker not available', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      await expect(cacheAudioFile('https://example.com/audio.mp3')).resolves.not.toThrow();
    });

    it('should handle service worker not ready', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          ready: Promise.reject(new Error('Not ready')),
        },
        writable: true,
        configurable: true,
      });

      await expect(cacheAudioFile('https://example.com/audio.mp3')).resolves.not.toThrow();
    });
  });

});
