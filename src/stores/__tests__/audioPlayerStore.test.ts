/**
 * Audio Player Store Tests
 * 
 * Tests for Zustand audio player state management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioPlayerStore } from '../audioPlayerStore';
import type { AudioPlayerTrack } from '../audioPlayerStore';

describe('AudioPlayerStore', () => {
  const mockTrack: AudioPlayerTrack = {
    id: '1',
    title: 'Test Track',
    audio_url: 'https://example.com/audio.mp3',
    cover_url: 'https://example.com/cover.jpg',
    duration: 180,
  };

  const mockTrack2: AudioPlayerTrack = {
    id: '2',
    title: 'Test Track 2',
    audio_url: 'https://example.com/audio2.mp3',
    duration: 200,
  };

  beforeEach(() => {
    // Reset store before each test
    useAudioPlayerStore.setState({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      volume: 0.8,
      currentTime: 0,
      duration: 0,
      bufferingProgress: 0,
      currentQueueIndex: -1,
      availableVersions: [],
      currentVersionIndex: -1,
    });
  });

  describe('Playback Actions', () => {
    it('should play a new track', () => {
      const { playTrack } = useAudioPlayerStore.getState();
      playTrack(mockTrack);

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack).toEqual(mockTrack);
      expect(state.isPlaying).toBe(true);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(180);
    });

    it('should resume same track', () => {
      const { playTrack } = useAudioPlayerStore.getState();
      
      // Play track first
      playTrack(mockTrack);
      useAudioPlayerStore.setState({ isPlaying: false, currentTime: 30 });

      // Play same track again
      playTrack(mockTrack);

      const state = useAudioPlayerStore.getState();
      expect(state.isPlaying).toBe(true);
      expect(state.currentTime).toBe(30); // Should not reset
    });

    it('should toggle play/pause', () => {
      const { playTrack, togglePlayPause } = useAudioPlayerStore.getState();
      
      playTrack(mockTrack);
      expect(useAudioPlayerStore.getState().isPlaying).toBe(true);

      togglePlayPause();
      expect(useAudioPlayerStore.getState().isPlaying).toBe(false);

      togglePlayPause();
      expect(useAudioPlayerStore.getState().isPlaying).toBe(true);
    });

    it('should pause playback', () => {
      const { playTrack, pause } = useAudioPlayerStore.getState();
      
      playTrack(mockTrack);
      pause();

      expect(useAudioPlayerStore.getState().isPlaying).toBe(false);
    });

    it('should resume playback', () => {
      const { playTrack, pause, resume } = useAudioPlayerStore.getState();
      
      playTrack(mockTrack);
      pause();
      resume();

      expect(useAudioPlayerStore.getState().isPlaying).toBe(true);
    });

    it('should clear current track', () => {
      const { playTrack, clearCurrentTrack } = useAudioPlayerStore.getState();
      
      playTrack(mockTrack);
      clearCurrentTrack();

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack).toBeNull();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(0);
    });
  });

  describe('Queue Actions', () => {
    it('should add track to queue', () => {
      const { addToQueue } = useAudioPlayerStore.getState();
      
      addToQueue(mockTrack);
      addToQueue(mockTrack2);

      const state = useAudioPlayerStore.getState();
      expect(state.queue).toHaveLength(2);
      expect(state.queue[0]).toEqual(mockTrack);
      expect(state.queue[1]).toEqual(mockTrack2);
    });

    it('should remove track from queue', () => {
      const { addToQueue, removeFromQueue } = useAudioPlayerStore.getState();
      
      addToQueue(mockTrack);
      addToQueue(mockTrack2);
      removeFromQueue('1');

      const state = useAudioPlayerStore.getState();
      expect(state.queue).toHaveLength(1);
      expect(state.queue[0].id).toBe('2');
    });

    it('should clear queue', () => {
      const { addToQueue, clearQueue } = useAudioPlayerStore.getState();
      
      addToQueue(mockTrack);
      addToQueue(mockTrack2);
      clearQueue();

      const state = useAudioPlayerStore.getState();
      expect(state.queue).toHaveLength(0);
      expect(state.currentQueueIndex).toBe(-1);
    });

    it('should play next track in queue', () => {
      const { playTrackWithQueue, playNext } = useAudioPlayerStore.getState();
      
      playTrackWithQueue(mockTrack, [mockTrack, mockTrack2]);
      playNext();

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack?.id).toBe('2');
      expect(state.currentQueueIndex).toBe(1);
      expect(state.isPlaying).toBe(true);
    });

    it('should play previous track in queue', () => {
      const { playTrackWithQueue, playNext, playPrevious } = useAudioPlayerStore.getState();
      
      playTrackWithQueue(mockTrack, [mockTrack, mockTrack2]);
      playNext(); // Move to track 2
      
      // Set current time < 3 seconds to trigger actual previous
      useAudioPlayerStore.setState({ currentTime: 1 });
      
      playPrevious();

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack?.id).toBe('1');
      expect(state.currentQueueIndex).toBe(0);
    });

    it('should restart current track if > 3 seconds in', () => {
      const { playTrack, playPrevious } = useAudioPlayerStore.getState();
      
      playTrack(mockTrack);
      useAudioPlayerStore.setState({ currentTime: 30 });
      
      playPrevious();

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack?.id).toBe('1'); // Same track
      expect(state.currentTime).toBe(0); // Reset to start
    });
  });

  describe('Audio Controls', () => {
    it('should set volume', () => {
      const { setVolume } = useAudioPlayerStore.getState();
      
      setVolume(0.5);
      expect(useAudioPlayerStore.getState().volume).toBe(0.5);
    });

    it('should clamp volume between 0 and 1', () => {
      const { setVolume } = useAudioPlayerStore.getState();
      
      setVolume(1.5);
      expect(useAudioPlayerStore.getState().volume).toBe(1);

      setVolume(-0.5);
      expect(useAudioPlayerStore.getState().volume).toBe(0);
    });

    it('should seek to position', () => {
      const { seekTo } = useAudioPlayerStore.getState();
      
      seekTo(30);
      expect(useAudioPlayerStore.getState().currentTime).toBe(30);
    });

    it('should update current time', () => {
      const { updateCurrentTime } = useAudioPlayerStore.getState();
      
      updateCurrentTime(45);
      expect(useAudioPlayerStore.getState().currentTime).toBe(45);
    });

    it('should update duration', () => {
      const { updateDuration } = useAudioPlayerStore.getState();
      
      updateDuration(300);
      expect(useAudioPlayerStore.getState().duration).toBe(300);
    });

    it('should update buffering progress', () => {
      const { updateBufferingProgress } = useAudioPlayerStore.getState();
      
      updateBufferingProgress(0.75);
      expect(useAudioPlayerStore.getState().bufferingProgress).toBe(0.75);
    });
  });

  describe('playTrackWithQueue', () => {
    it('should set queue and play track', () => {
      const { playTrackWithQueue } = useAudioPlayerStore.getState();
      
      playTrackWithQueue(mockTrack2, [mockTrack, mockTrack2]);

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack).toEqual(mockTrack2);
      expect(state.queue).toHaveLength(2);
      expect(state.currentQueueIndex).toBe(1);
      expect(state.isPlaying).toBe(true);
    });
  });
});
