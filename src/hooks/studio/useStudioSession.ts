import { useState, useCallback, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface StudioTrack {
  id: string;
  name: string;
  audioUrl: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  color: string;
  duration: number;
  isStem?: boolean;
  stemType?: string;
  parentTrackId?: string;
}

export const useStudioSession = () => {
  const { trackId } = useParams();
  const [tracks, setTracks] = useState<StudioTrack[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const audioElements = useRef<Map<string, HTMLAudioElement>>(new Map());
  const animationFrameRef = useRef<number>();

  // Load track and stems on mount
  useEffect(() => {
    if (trackId) {
      loadTrackWithStems(trackId);
    }
  }, [trackId]);

  const loadTrackWithStems = async (id: string) => {
    try {
      // Load main track
      const { data: track, error: trackError } = await supabase
        .from('tracks')
        .select('*')
        .eq('id', id)
        .single();

      if (trackError) throw trackError;

      if (track?.audio_url) {
        const mainTrack: StudioTrack = {
          id: track.id,
          name: track.title || 'Main Track',
          audioUrl: track.audio_url,
          volume: 1,
          pan: 0,
          muted: false,
          solo: false,
          color: '#3b82f6',
          duration: track.duration_seconds || 0,
        };

        setTracks([mainTrack]);

        // Load stems
        const { data: stems, error: stemsError } = await supabase
          .from('track_stems')
          .select('*')
          .eq('track_id', id);

        if (!stemsError && stems && stems.length > 0) {
          const stemTracks: StudioTrack[] = stems.map((stem, index) => ({
            id: stem.id,
            name: stem.stem_type || `Stem ${index + 1}`,
            audioUrl: stem.audio_url,
            volume: 1,
            pan: 0,
            muted: false,
            solo: false,
            color: getColorForStem(stem.stem_type),
            duration: track.duration_seconds || 0,
            isStem: true,
            stemType: stem.stem_type,
            parentTrackId: track.id,
          }));

          setTracks((prev) => [...prev, ...stemTracks]);
        }
      }
    } catch (error) {
      logger.error('Failed to load track', error as Error, 'useStudioSession');
    }
  };

  const addTrack = useCallback(() => {
    const newTrack: StudioTrack = {
      id: `track-${Date.now()}`,
      name: `Track ${tracks.length + 1}`,
      audioUrl: '',
      volume: 1,
      pan: 0,
      muted: false,
      solo: false,
      color: getRandomColor(),
      duration: 0,
    };
    setTracks((prev) => [...prev, newTrack]);
  }, [tracks.length]);

  const removeTrack = useCallback((trackId: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    audioElements.current.delete(trackId);
  }, []);

  const selectTrack = useCallback((trackId: string) => {
    setSelectedTrack(trackId);
  }, []);

  const updateTrackVolume = useCallback((trackId: string, volume: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, volume } : t))
    );
    const audio = audioElements.current.get(trackId);
    if (audio) audio.volume = volume;
  }, []);

  const updateTrackPan = useCallback((trackId: string, pan: number) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, pan } : t))
    );
  }, []);

  const toggleMute = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, muted: !t.muted } : t))
    );
    const audio = audioElements.current.get(trackId);
    if (audio) audio.muted = !audio.muted;
  }, []);

  const toggleSolo = useCallback((trackId: string) => {
    setTracks((prev) =>
      prev.map((t) => (t.id === trackId ? { ...t, solo: !t.solo } : t))
    );
  }, []);

  const play = useCallback(() => {
    tracks.forEach((track) => {
      const audio = audioElements.current.get(track.id);
      if (audio && !track.muted) {
        audio.currentTime = currentTime;
        audio.play();
      }
    });
    setIsPlaying(true);

    const updateTime = () => {
      const firstAudio = audioElements.current.values().next().value;
      if (firstAudio) {
        setCurrentTime(firstAudio.currentTime);
      }
      animationFrameRef.current = requestAnimationFrame(updateTime);
    };
    updateTime();
  }, [tracks, currentTime]);

  const pause = useCallback(() => {
    tracks.forEach((track) => {
      const audio = audioElements.current.get(track.id);
      if (audio) audio.pause();
    });
    setIsPlaying(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [tracks]);

  const stop = useCallback(() => {
    tracks.forEach((track) => {
      const audio = audioElements.current.get(track.id);
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
    });
    setIsPlaying(false);
    setCurrentTime(0);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, [tracks]);

  const seek = useCallback((time: number) => {
    tracks.forEach((track) => {
      const audio = audioElements.current.get(track.id);
      if (audio) audio.currentTime = time;
    });
    setCurrentTime(time);
  }, [tracks]);

  // Create audio elements for tracks
  useEffect(() => {
    tracks.forEach((track) => {
      if (track.audioUrl && !audioElements.current.has(track.id)) {
        const audio = new Audio(track.audioUrl);
        audio.volume = track.volume;
        audio.muted = track.muted;
        audioElements.current.set(track.id, audio);
      }
    });

    // Cleanup
    return () => {
      audioElements.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      audioElements.current.clear();
    };
  }, [tracks]);

  return {
    tracks,
    selectedTrack,
    isPlaying,
    currentTime,
    zoom,
    addTrack,
    removeTrack,
    selectTrack,
    updateTrackVolume,
    updateTrackPan,
    toggleMute,
    toggleSolo,
    play,
    pause,
    stop,
    seek,
    setZoom,
  };
};

const getColorForStem = (stemType: string | null): string => {
  const colors: Record<string, string> = {
    vocals: '#ef4444',
    instrumental: '#3b82f6',
    drums: '#f59e0b',
    bass: '#8b5cf6',
    guitar: '#10b981',
    piano: '#ec4899',
    other: '#6b7280',
  };
  return colors[stemType?.toLowerCase() || 'other'] || colors.other;
};

const getRandomColor = (): string => {
  const colors = ['#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#ec4899'];
  return colors[Math.floor(Math.random() * colors.length)];
};
