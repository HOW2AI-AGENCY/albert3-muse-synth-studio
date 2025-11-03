export interface Clip {
  id: string;
  name: string;
  start: number;
  end: number;
  audioUrl: string;
}

export interface Track {
  id: string;
  name: string;
  clips: Clip[];
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
}
