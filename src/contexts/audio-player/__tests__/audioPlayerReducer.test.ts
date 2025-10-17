import { describe, it, expect } from 'vitest';
import type { AudioPlayerTrack } from '@/types/track';

// Mock reducer functions (simplified test)
const initialAudioState = {
  currentTrack: null as AudioPlayerTrack | null,
  isPlaying: false,
  duration: 0,
  currentTime: 0,
  volume: 1,
  isMuted: false,
  queue: [] as AudioPlayerTrack[],
  repeatMode: 'off' as 'off' | 'one' | 'all',
  isShuffle: false,
  isLoading: false,
  error: null as string | null,
};

type AudioState = typeof initialAudioState;
type AudioAction = 
  | { type: 'SET_TRACK'; payload: AudioPlayerTrack | null }
  | { type: 'SET_PLAYING'; payload: boolean }
  | { type: 'SET_DURATION'; payload: number }
  | { type: 'SET_CURRENT_TIME'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'SET_MUTED'; payload: boolean }
  | { type: 'SET_QUEUE'; payload: AudioPlayerTrack[] }
  | { type: 'SET_REPEAT_MODE'; payload: 'off' | 'one' | 'all' }
  | { type: 'SET_SHUFFLE'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null };

const audioPlayerReducer = (state: AudioState, action: AudioAction): AudioState => {
  switch (action.type) {
    case 'SET_TRACK':
      return { ...state, currentTrack: action.payload, currentTime: 0, isPlaying: false };
    case 'SET_PLAYING':
      return { ...state, isPlaying: action.payload };
    case 'SET_DURATION':
      return { ...state, duration: action.payload };
    case 'SET_CURRENT_TIME':
      return { ...state, currentTime: Math.min(action.payload, state.duration) };
    case 'SET_VOLUME':
      return { ...state, volume: Math.max(0, Math.min(1, action.payload)) };
    case 'SET_MUTED':
      return { ...state, isMuted: action.payload };
    case 'SET_QUEUE':
      return { ...state, queue: action.payload };
    case 'SET_REPEAT_MODE':
      return { ...state, repeatMode: action.payload };
    case 'SET_SHUFFLE':
      return { ...state, isShuffle: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

const mockTrack: AudioPlayerTrack = {
  id: 'track-1',
  title: 'Test Track',
  audio_url: 'https://example.com/audio.mp3',
  cover_url: undefined,
  duration: 180,
};

describe('audioPlayerReducer', () => {
  describe('SET_TRACK', () => {
    it('should set current track and reset position', () => {
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_TRACK',
        payload: mockTrack,
      });

      expect(state.currentTrack).toEqual(mockTrack);
      expect(state.currentTime).toBe(0);
      expect(state.isPlaying).toBe(false);
    });

    it('should clear track when payload is null', () => {
      const stateWithTrack = { ...initialAudioState, currentTrack: mockTrack };
      const state = audioPlayerReducer(stateWithTrack, {
        type: 'SET_TRACK',
        payload: null,
      });

      expect(state.currentTrack).toBeNull();
      expect(state.currentTime).toBe(0);
    });
  });

  describe('SET_PLAYING', () => {
    it('should update isPlaying state', () => {
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_PLAYING',
        payload: true,
      });

      expect(state.isPlaying).toBe(true);
    });
  });

  describe('SET_DURATION', () => {
    it('should update duration', () => {
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_DURATION',
        payload: 240,
      });

      expect(state.duration).toBe(240);
    });
  });

  describe('SET_CURRENT_TIME', () => {
    it('should update current time', () => {
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_CURRENT_TIME',
        payload: 60,
      });

      expect(state.currentTime).toBe(60);
    });

    it('should clamp current time to duration', () => {
      const stateWithDuration = { ...initialAudioState, duration: 100 };
      const state = audioPlayerReducer(stateWithDuration, {
        type: 'SET_CURRENT_TIME',
        payload: 150,
      });

      expect(state.currentTime).toBe(100);
    });
  });

  describe('SET_VOLUME', () => {
    it('should update volume within valid range', () => {
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_VOLUME',
        payload: 0.7,
      });

      expect(state.volume).toBe(0.7);
    });

    it('should clamp volume to 0-1 range', () => {
      const state1 = audioPlayerReducer(initialAudioState, {
        type: 'SET_VOLUME',
        payload: 1.5,
      });
      expect(state1.volume).toBe(1);

      const state2 = audioPlayerReducer(initialAudioState, {
        type: 'SET_VOLUME',
        payload: -0.5,
      });
      expect(state2.volume).toBe(0);
    });
  });

  describe('SET_MUTED', () => {
    it('should update muted state', () => {
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_MUTED',
        payload: true,
      });

      expect(state.isMuted).toBe(true);
    });
  });

  describe('SET_QUEUE', () => {
    it('should update queue with new tracks', () => {
      const queue = [mockTrack, { ...mockTrack, id: 'track-2' }];
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_QUEUE',
        payload: queue,
      });

      expect(state.queue).toEqual(queue);
      expect(state.queue).toHaveLength(2);
    });
  });

  describe('SET_REPEAT_MODE', () => {
    it('should cycle through repeat modes', () => {
      const state1 = audioPlayerReducer(initialAudioState, {
        type: 'SET_REPEAT_MODE',
        payload: 'one',
      });
      expect(state1.repeatMode).toBe('one');

      const state2 = audioPlayerReducer(state1, {
        type: 'SET_REPEAT_MODE',
        payload: 'all',
      });
      expect(state2.repeatMode).toBe('all');

      const state3 = audioPlayerReducer(state2, {
        type: 'SET_REPEAT_MODE',
        payload: 'off',
      });
      expect(state3.repeatMode).toBe('off');
    });
  });

  describe('SET_SHUFFLE', () => {
    it('should update shuffle state', () => {
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_SHUFFLE',
        payload: true,
      });

      expect(state.isShuffle).toBe(true);
    });
  });

  describe('SET_LOADING', () => {
    it('should update loading state', () => {
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_LOADING',
        payload: true,
      });

      expect(state.isLoading).toBe(true);
    });
  });

  describe('SET_ERROR', () => {
    it('should set error message', () => {
      const errorMessage = 'Failed to load audio';
      const state = audioPlayerReducer(initialAudioState, {
        type: 'SET_ERROR',
        payload: errorMessage,
      });

      expect(state.error).toBe(errorMessage);
    });

    it('should clear error when payload is null', () => {
      const stateWithError = { ...initialAudioState, error: 'Some error' };
      const state = audioPlayerReducer(stateWithError, {
        type: 'SET_ERROR',
        payload: null,
      });

      expect(state.error).toBeNull();
    });
  });
});
