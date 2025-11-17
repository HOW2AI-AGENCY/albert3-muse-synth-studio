/**
 * Hook для обработчиков событий Generate страницы
 * Оптимизация: вынесено из основного компонента
 */
import { useCallback } from 'react';
import type { Track } from '@/services/api.service';
import type { ImperativePanelHandle } from 'react-resizable-panels';

interface UseGeneratePageHandlersProps {
  setSelectedTrack: (track: Track | null) => void;
  setShowGenerator: (show: boolean) => void;
  setSeparateStemsOpen: (open: boolean) => void;
  setSelectedTrackForStems: (track: { id: string; title: string } | null) => void;
  setExtendOpen: (open: boolean) => void;
  setSelectedTrackForExtend: (track: Track | null) => void;
  setCoverOpen: (open: boolean) => void;
  setSelectedTrackForCover: (track: { id: string; title: string } | null) => void;
  setCreatePersonaOpen: (open: boolean) => void;
  setSelectedTrackForPersona: (track: Track | null) => void;
  detailPanelRef: React.RefObject<ImperativePanelHandle>;
  deleteTrack: (id: string) => Promise<void>;
  refreshTracks: () => void;
}

export const useGeneratePageHandlers = ({
  setSelectedTrack,
  setShowGenerator,
  setSeparateStemsOpen,
  setSelectedTrackForStems,
  setExtendOpen,
  setSelectedTrackForExtend,
  setCoverOpen,
  setSelectedTrackForCover,
  setCreatePersonaOpen,
  setSelectedTrackForPersona,
  detailPanelRef,
  deleteTrack,
  refreshTracks,
}: UseGeneratePageHandlersProps) => {
  const handleTrackSelect = useCallback((track: Track) => {
    setSelectedTrack(track);
    detailPanelRef.current?.expand();
  }, [setSelectedTrack, detailPanelRef]);

  const handleCloseDetail = useCallback(() => {
    setSelectedTrack(null);
    detailPanelRef.current?.collapse();
  }, [setSelectedTrack, detailPanelRef]);

  const handleTrackGenerated = useCallback(() => {
    setShowGenerator(false);
    refreshTracks();
  }, [setShowGenerator, refreshTracks]);

  const handleSeparateStems = useCallback((track: Track) => {
    setSelectedTrackForStems({ id: track.id, title: track.title });
    setSeparateStemsOpen(true);
  }, [setSelectedTrackForStems, setSeparateStemsOpen]);

  const handleExtendTrack = useCallback((track: Track) => {
    setSelectedTrackForExtend(track);
    setExtendOpen(true);
  }, [setSelectedTrackForExtend, setExtendOpen]);

  const handleCreateCover = useCallback((track: Track) => {
    setSelectedTrackForCover({ id: track.id, title: track.title });
    setCoverOpen(true);
  }, [setSelectedTrackForCover, setCoverOpen]);

  const handleCreatePersona = useCallback((track: Track) => {
    setSelectedTrackForPersona(track);
    setCreatePersonaOpen(true);
  }, [setSelectedTrackForPersona, setCreatePersonaOpen]);

  const handleDelete = useCallback(async (trackId: string) => {
    try {
      await deleteTrack(trackId);
      handleCloseDetail();
      refreshTracks();
    } catch (error) {
      console.error('Delete error:', error);
    }
  }, [deleteTrack, handleCloseDetail, refreshTracks]);

  const handleRemix = useCallback((track: Track) => {
    // Remix functionality removed as not in TrackOperations
    console.log('Remix track:', track.id);
  }, []);

  return {
    handleTrackSelect,
    handleCloseDetail,
    handleTrackGenerated,
    handleSeparateStems,
    handleExtendTrack,
    handleCreateCover,
    handleCreatePersona,
    handleDelete,
    handleRemix,
  };
};
