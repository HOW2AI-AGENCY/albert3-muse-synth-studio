import { useContext } from 'react';
import { SelectedTracksContext } from './context';

export function useSelectedTracks() {
  const context = useContext(SelectedTracksContext);
  if (context === undefined) {
    throw new Error('useSelectedTracks must be used within a SelectedTracksProvider');
  }
  return context;
}