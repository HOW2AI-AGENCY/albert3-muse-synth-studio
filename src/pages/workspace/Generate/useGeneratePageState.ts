/**
 * Hook для управления состоянием Generate страницы
 * Оптимизация: вынесено из основного компонента для уменьшения bundle size
 */
import { useState, useCallback, useRef } from 'react';
import type { Track } from '@/services/tracks/track.service';
import type { ImperativePanelHandle } from 'react-resizable-panels';

export const useGeneratePageState = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('tracks-view-mode') : 'grid';
      return (saved as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });

  // Dialog states
  const [separateStemsOpen, setSeparateStemsOpen] = useState(false);
  const [selectedTrackForStems, setSelectedTrackForStems] = useState<{ id: string; title: string } | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [selectedTrackForExtend, setSelectedTrackForExtend] = useState<Track | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [selectedTrackForCover, setSelectedTrackForCover] = useState<{ id: string; title: string } | null>(null);
  const [createPersonaOpen, setCreatePersonaOpen] = useState(false);
  const [selectedTrackForPersona, setSelectedTrackForPersona] = useState<Track | null>(null);

  const detailPanelRef = useRef<ImperativePanelHandle>(null);

  const handleViewModeChange = useCallback((mode: 'grid' | 'list') => {
    setViewMode(mode);
    try {
      localStorage.setItem('tracks-view-mode', mode);
    } catch (error) {
      console.error('Failed to save view mode:', error);
    }
  }, []);

  return {
    selectedProjectId,
    setSelectedProjectId,
    selectedTrack,
    setSelectedTrack,
    showGenerator,
    setShowGenerator,
    viewMode,
    handleViewModeChange,
    separateStemsOpen,
    setSeparateStemsOpen,
    selectedTrackForStems,
    setSelectedTrackForStems,
    extendOpen,
    setExtendOpen,
    selectedTrackForExtend,
    setSelectedTrackForExtend,
    coverOpen,
    setCoverOpen,
    selectedTrackForCover,
    setSelectedTrackForCover,
    createPersonaOpen,
    setCreatePersonaOpen,
    selectedTrackForPersona,
    setSelectedTrackForPersona,
    detailPanelRef,
  };
};
