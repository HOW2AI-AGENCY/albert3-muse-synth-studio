import { createContext } from 'react';

export interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  track_id: string;
}

export interface StemMixerContextType {
  activeStemIds: Set<string>;
  stemVolumes: Map<string, number>;
  stemMuted: Map<string, boolean>;
  soloStemId: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  masterVolume: number;
  loadStems: (stems: TrackStem[]) => void;
  toggleStem: (stemId: string) => void;
  setStemVolume: (stemId: string, volume: number) => void;
  toggleStemMute: (stemId: string) => void;
  setSolo: (stemId: string | null) => void;
  setMasterVolume: (volume: number) => void;
  play: () => Promise<void>;
  pause: () => void;
  seekTo: (time: number) => void;
  resetAll: () => void;
}

export const StemMixerContext = createContext<StemMixerContextType | undefined>(undefined);