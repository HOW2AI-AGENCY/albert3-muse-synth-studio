import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAudioRecorder } from '../useAudioRecorder';

// Mock a more complete MediaRecorder and related browser APIs
const mockMediaStream = {
  getTracks: () => [{ stop: vi.fn() }],
};

class MockMediaRecorder {
  stream: MediaStream;
  mimeType: string;
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';

  constructor(stream: MediaStream, options: { mimeType: string }) {
    this.stream = stream;
    this.mimeType = options.mimeType;
  }

  start() {
    this.state = 'recording';
    // Simulate data being available periodically
    setTimeout(() => {
      if (this.state === 'recording' && this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['chunk'], { type: this.mimeType }) });
      }
    }, 100);
  }

  stop() {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  }

  static isTypeSupported(type: string) {
      return type.startsWith('audio/webm');
  }
}

global.MediaRecorder = MockMediaRecorder as any;

Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: vi.fn().mockResolvedValue(mockMediaStream),
  },
  writable: true,
});

// Mock URL.createObjectURL and revokeObjectURL which are used by the hook
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'blob:http://localhost/mock-blob-url'),
});
Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});


vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('useAudioRecorder', () => {

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('should start recording successfully', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
      await vi.runAllTimersAsync();
    });

    expect(result.current.isRecording).toBe(true);
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
      audio: { echoCancellation: true, noiseSuppression: true },
    });
  });

  it('should stop recording and create an audio blob URL', async () => {
    const onRecordComplete = vi.fn();
    const { result } = renderHook(() => useAudioRecorder(onRecordComplete));

    await act(async () => {
      await result.current.startRecording();
    });

    // Let some time pass for data to be available
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    await act(async () => {
      result.current.stopRecording();
      await vi.runAllTimersAsync();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).toBeInstanceOf(Blob);
    expect(result.current.audioUrl).toBe('blob:http://localhost/mock-blob-url');
    expect(onRecordComplete).toHaveBeenCalledWith('blob:http://localhost/mock-blob-url');
  });

  it('should track recording time correctly', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      vi.advanceTimersByTime(5000); // 5 seconds
    });

    expect(result.current.recordingTime).toBe(5);
  });

  it('should automatically stop when max recording time is reached', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    await act(async () => {
      await result.current.startRecording();
    });

    await act(async () => {
      // Advance time to just over the max limit (60s)
      vi.advanceTimersByTime(61 * 1000);
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.recordingTime).toBe(60);
    expect(result.current.audioUrl).not.toBeNull();
  });

  it('should reset the state', async () => {
    const { result } = renderHook(() => useAudioRecorder());

    // Record and stop to get a state
    await act(async () => {
      await result.current.startRecording();
      vi.advanceTimersByTime(1000);
      result.current.stopRecording();
      await vi.runAllTimersAsync();
    });

    expect(result.current.audioUrl).not.toBeNull();
    expect(result.current.recordingTime).toBe(1);

    // Now reset
    await act(async () => {
      result.current.reset();
    });

    expect(result.current.isRecording).toBe(false);
    expect(result.current.audioBlob).toBeNull();
    expect(result.current.audioUrl).toBeNull();
    expect(result.current.recordingTime).toBe(0);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:http://localhost/mock-blob-url');
  });
});
