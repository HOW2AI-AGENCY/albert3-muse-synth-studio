import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type { Track } from '@/services/api.service';

interface SelectedTracksState {
  selectedTrackIds: Set<string>;
  isSelectionMode: boolean;
}

type SelectedTracksAction =
  | { type: 'SELECT_TRACK'; trackId: string }
  | { type: 'DESELECT_TRACK'; trackId: string }
  | { type: 'TOGGLE_TRACK'; trackId: string }
  | { type: 'SELECT_ALL'; trackIds: string[] }
  | { type: 'DESELECT_ALL' }
  | { type: 'SET_SELECTION_MODE'; enabled: boolean }
  | { type: 'CLEAR_SELECTION' };

interface SelectedTracksContextType {
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

const SelectedTracksContext = createContext<SelectedTracksContextType | undefined>(undefined);

const initialState: SelectedTracksState = {
  selectedTrackIds: new Set(),
  isSelectionMode: false,
};

function selectedTracksReducer(state: SelectedTracksState, action: SelectedTracksAction): SelectedTracksState {
  switch (action.type) {
    case 'SELECT_TRACK': {
      const newSelectedTrackIds = new Set(state.selectedTrackIds);
      newSelectedTrackIds.add(action.trackId);
      return {
        ...state,
        selectedTrackIds: newSelectedTrackIds,
      };
    }

    case 'DESELECT_TRACK': {
      const newSelectedTrackIds = new Set(state.selectedTrackIds);
      newSelectedTrackIds.delete(action.trackId);
      return {
        ...state,
        selectedTrackIds: newSelectedTrackIds,
      };
    }

    case 'TOGGLE_TRACK': {
      const newSelectedTrackIds = new Set(state.selectedTrackIds);
      if (newSelectedTrackIds.has(action.trackId)) {
        newSelectedTrackIds.delete(action.trackId);
      } else {
        newSelectedTrackIds.add(action.trackId);
      }
      return {
        ...state,
        selectedTrackIds: newSelectedTrackIds,
      };
    }

    case 'SELECT_ALL': {
      return {
        ...state,
        selectedTrackIds: new Set(action.trackIds),
      };
    }

    case 'DESELECT_ALL': {
      return {
        ...state,
        selectedTrackIds: new Set(),
      };
    }

    case 'SET_SELECTION_MODE': {
      return {
        ...state,
        isSelectionMode: action.enabled,
        // Clear selection when exiting selection mode
        selectedTrackIds: action.enabled ? state.selectedTrackIds : new Set(),
      };
    }

    case 'CLEAR_SELECTION': {
      return {
        ...state,
        selectedTrackIds: new Set(),
        isSelectionMode: false,
      };
    }

    default:
      return state;
  }
}

interface SelectedTracksProviderProps {
  children: React.ReactNode;
}

export const SelectedTracksProvider: React.FC<SelectedTracksProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(selectedTracksReducer, initialState);

  const selectTrack = useCallback((trackId: string) => {
    dispatch({ type: 'SELECT_TRACK', trackId });
  }, []);

  const deselectTrack = useCallback((trackId: string) => {
    dispatch({ type: 'DESELECT_TRACK', trackId });
  }, []);

  const toggleTrack = useCallback((trackId: string) => {
    dispatch({ type: 'TOGGLE_TRACK', trackId });
  }, []);

  const selectAll = useCallback((trackIds: string[]) => {
    dispatch({ type: 'SELECT_ALL', trackIds });
  }, []);

  const deselectAll = useCallback(() => {
    dispatch({ type: 'DESELECT_ALL' });
  }, []);

  const setSelectionMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_SELECTION_MODE', enabled });
  }, []);

  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  const isTrackSelected = useCallback((trackId: string) => {
    return state.selectedTrackIds.has(trackId);
  }, [state.selectedTrackIds]);

  const value: SelectedTracksContextType = {
    selectedTrackIds: state.selectedTrackIds,
    isSelectionMode: state.isSelectionMode,
    selectedTracksCount: state.selectedTrackIds.size,
    selectTrack,
    deselectTrack,
    toggleTrack,
    selectAll,
    deselectAll,
    setSelectionMode,
    clearSelection,
    isTrackSelected,
  };

  return (
    <SelectedTracksContext.Provider value={value}>
      {children}
    </SelectedTracksContext.Provider>
  );
}

export function useSelectedTracks() {
  const context = useContext(SelectedTracksContext);
  if (context === undefined) {
    throw new Error('useSelectedTracks must be used within a SelectedTracksProvider');
  }
  return context;
}