/**
 * Типы для Audio Player Context
 */
import { AudioPlayerTrack } from '@/types/track';

export interface AudioPlayerContextType {
  currentTrack: AudioPlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: AudioPlayerTrack[];
  currentQueueIndex: number;
  playTrack: (track: AudioPlayerTrack) => void;
  playTrackWithQueue: (track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => void;
  togglePlayPause: () => void;
  pauseTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: AudioPlayerTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  switchToVersion: (versionId: string) => void;
  getAvailableVersions: () => AudioPlayerTrack[];
  currentVersionIndex: number;
  audioRef: React.RefObject<HTMLAudioElement>;
  clearCurrentTrack: () => void;
  isPlayerVisible: boolean;
}

export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.webm'] as const;

export const PLAYER_HEIGHTS = {
  mobile: 72,
  desktop: 88,
  safeAreaOffset: 16,
} as const;
