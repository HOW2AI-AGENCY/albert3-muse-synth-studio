/**
 * Audio Player Store Tests
 * 
 * Tests for the Zustand audio player store
 * 
 * @module stores/__tests__/audioPlayerStore.test
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAudioPlayerStore } from '../audioPlayerStore';
import type { AudioPlayerTrack } from '../audioPlayerStore';

// Helper to create mock track
const createMockTrack = (id: string = '1'): AudioPlayerTrack => ({
  id,
  title: `Test Track ${id}`,
  audio_url: `https://example.com/audio-${id}.mp3`,
  cover_url: `https://example.com/cover-${id}.jpg`,
  duration: 180,
});

describe('AudioPlayerStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useAudioPlayerStore.setState({
      currentTrack: null,
      queue: [],
      isPlaying: false,
      volume: 1.0,
      currentTime: 0,
      duration: 0,
      isMuted: false,
      isLooping: false,
      isShuffling: false,
      playbackRate: 1.0,
    });
  });

  describe('Playback Actions', () => {
    it('should play a track', () => {
      const track = createMockTrack();
      const { play } = useAudioPlayerStore.getState();

      play(track);

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack).toEqual(track);
      expect(state.isPlaying).toBe(true);
      expect(state.currentTime).toBe(0);
      expect(state.duration).toBe(track.duration);
    });

    it('should resume same track when playing again', () => {
      const track = createMockTrack();
      const { play, pause } = useAudioPlayerStore.getState();

      // Play, pause, then play again
      play(track);
      pause();
      useAudioPlayerStore.setState({ currentTime: 60 }); // Simulate progress
      play(track);

      const state = useAudioPlayerStore.getState();
      expect(state.isPlaying).toBe(true);
      expect(state.currentTime).toBe(60); // Should keep progress
    });

    it('should reset when playing different track', () => {
      const track1 = createMockTrack('1');
      const track2 = createMockTrack('2');
      const { play } = useAudioPlayerStore.getState();

      play(track1);
      useAudioPlayerStore.setState({ currentTime: 60 });
      play(track2);

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack).toEqual(track2);
      expect(state.currentTime).toBe(0); // Should reset
    });

    it('should pause playback', () => {
      const track = createMockTrack();
      const { play, pause } = useAudioPlayerStore.getState();

      play(track);
      pause();

      expect(useAudioPlayerStore.getState().isPlaying).toBe(false);
    });

    it('should resume playback', () => {
      const track = createMockTrack();
      const { play, pause, resume } = useAudioPlayerStore.getState();

      play(track);
      pause();
      resume();

      expect(useAudioPlayerStore.getState().isPlaying).toBe(true);
    });

    it('should stop playback and reset time', () => {
      const track = createMockTrack();
      const { play, stop } = useAudioPlayerStore.getState();

      play(track);
      useAudioPlayerStore.setState({ currentTime: 60 });
      stop();

      const state = useAudioPlayerStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
    });

    it('should toggle play/pause', () => {
      const { togglePlayPause } = useAudioPlayerStore.getState();

      expect(useAudioPlayerStore.getState().isPlaying).toBe(false);
      
      togglePlayPause();
      expect(useAudioPlayerStore.getState().isPlaying).toBe(true);
      
      togglePlayPause();
      expect(useAudioPlayerStore.getState().isPlaying).toBe(false);
    });
  });

  describe('Queue Actions', () => {
    it('should add track to queue', () => {
      const track = createMockTrack();
      const { addToQueue } = useAudioPlayerStore.getState();

      addToQueue(track);

      expect(useAudioPlayerStore.getState().queue).toHaveLength(1);
      expect(useAudioPlayerStore.getState().queue[0]).toEqual(track);
    });

    it('should add multiple tracks to queue', () => {
      const track1 = createMockTrack('1');
      const track2 = createMockTrack('2');
      const { addToQueue } = useAudioPlayerStore.getState();

      addToQueue(track1);
      addToQueue(track2);

      const queue = useAudioPlayerStore.getState().queue;
      expect(queue).toHaveLength(2);
      expect(queue[0]).toEqual(track1);
      expect(queue[1]).toEqual(track2);
    });

    it('should remove track from queue', () => {
      const track1 = createMockTrack('1');
      const track2 = createMockTrack('2');
      const { addToQueue, removeFromQueue } = useAudioPlayerStore.getState();

      addToQueue(track1);
      addToQueue(track2);
      removeFromQueue('1');

      const queue = useAudioPlayerStore.getState().queue;
      expect(queue).toHaveLength(1);
      expect(queue[0].id).toBe('2');
    });

    it('should clear queue', () => {
      const { addToQueue, clearQueue } = useAudioPlayerStore.getState();

      addToQueue(createMockTrack('1'));
      addToQueue(createMockTrack('2'));
      clearQueue();

      expect(useAudioPlayerStore.getState().queue).toHaveLength(0);
    });

    it('should play next track from queue', () => {
      const track1 = createMockTrack('1');
      const track2 = createMockTrack('2');
      const { play, addToQueue, playNext } = useAudioPlayerStore.getState();

      play(track1);
      addToQueue(track2);
      playNext();

      const state = useAudioPlayerStore.getState();
      expect(state.currentTrack).toEqual(track2);
      expect(state.queue).toHaveLength(0);
      expect(state.isPlaying).toBe(true);
    });

    it('should stop when playing next with empty queue', () => {
      const track = createMockTrack();
      const { play, playNext } = useAudioPlayerStore.getState();

      play(track);
      playNext();

      const state = useAudioPlayerStore.getState();
      expect(state.isPlaying).toBe(false);
      expect(state.currentTime).toBe(0);
    });
  });

  describe('Audio Controls', () => {
    it('should set volume', () => {
      const { setVolume } = useAudioPlayerStore.getState();

      setVolume(0.5);

      const state = useAudioPlayerStore.getState();
      expect(state.volume).toBe(0.5);
      expect(state.isMuted).toBe(false);
    });

    it('should clamp volume between 0 and 1', () => {
      const { setVolume } = useAudioPlayerStore.getState();

      setVolume(-0.5);
      expect(useAudioPlayerStore.getState().volume).toBe(0);

      setVolume(1.5);
      expect(useAudioPlayerStore.getState().volume).toBe(1);
    });

    it('should toggle mute', () => {
      const { toggleMute } = useAudioPlayerStore.getState();

      expect(useAudioPlayerStore.getState().isMuted).toBe(false);
      
      toggleMute();
      expect(useAudioPlayerStore.getState().isMuted).toBe(true);
      
      toggleMute();
      expect(useAudioPlayerStore.getState().isMuted).toBe(false);
    });

    it('should unmute when volume is changed', () => {
      const { toggleMute, setVolume } = useAudioPlayerStore.getState();

      toggleMute(); // Mute
      setVolume(0.8); // Change volume

      const state = useAudioPlayerStore.getState();
      expect(state.isMuted).toBe(false);
      expect(state.volume).toBe(0.8);
    });

    it('should set current time', () => {
      const { setCurrentTime } = useAudioPlayerStore.getState();

      setCurrentTime(42);

      expect(useAudioPlayerStore.getState().currentTime).toBe(42);
    });

    it('should set duration', () => {
      const { setDuration } = useAudioPlayerStore.getState();

      setDuration(180);

      expect(useAudioPlayerStore.getState().duration).toBe(180);
    });

    it('should set looping', () => {
      const { setLooping } = useAudioPlayerStore.getState();

      setLooping(true);
      expect(useAudioPlayerStore.getState().isLooping).toBe(true);

      setLooping(false);
      expect(useAudioPlayerStore.getState().isLooping).toBe(false);
    });

    it('should set shuffling', () => {
      const { setShuffling } = useAudioPlayerStore.getState();

      setShuffling(true);
      expect(useAudioPlayerStore.getState().isShuffling).toBe(true);

      setShuffling(false);
      expect(useAudioPlayerStore.getState().isShuffling).toBe(false);
    });

    it('should set playback rate', () => {
      const { setPlaybackRate } = useAudioPlayerStore.getState();

      setPlaybackRate(1.5);
      expect(useAudioPlayerStore.getState().playbackRate).toBe(1.5);
    });

    it('should clamp playback rate between 0.25 and 2.0', () => {
      const { setPlaybackRate } = useAudioPlayerStore.getState();

      setPlaybackRate(0.1);
      expect(useAudioPlayerStore.getState().playbackRate).toBe(0.25);

      setPlaybackRate(3.0);
      expect(useAudioPlayerStore.getState().playbackRate).toBe(2.0);
    });
  });
});
