import { createContext } from 'react';

export interface SelectedTracksState {
  selectedTrackIds: Set<string>;
  isSelectionMode: boolean;
}

export interface SelectedTracksContextType {
  selectedTrackIds: Set<string>;
  isSelectionMode: boolean;
  selectedTracksCount: number;
  selectTrack: (trackId: string) => void;
  deselectTrack: (trackId: string) => void;
  toggleTrack: (trackId: string) => void;
  selectAll: (trackIds: string[]) => void;
  deselectAll: () => void;
  setSelectionMode: (enabled: boolean) => void;
  clearSelection: () => void;
  isTrackSelected: (trackId: string) => boolean;
}

export const SelectedTracksContext = createContext<SelectedTracksContextType | undefined>(undefined);