/**
 * Hook for managing Library dialogs state
 * Extracted from Library.tsx to reduce component complexity
 */

import { useState, useCallback } from 'react';
import type { DisplayTrack } from '@/types/track.types';

interface DialogState<T = { id: string; title: string }> {
  isOpen: boolean;
  data: T | null;
}

export interface LibraryDialogsState {
  // Dialog states
  separateStems: DialogState;
  extend: DialogState<DisplayTrack>;
  cover: DialogState;
  delete: DialogState;
  addVocal: DialogState<string>;
  createPersona: DialogState<DisplayTrack>;
  upscale: DialogState<{ id: string; title: string; audioUrl: string | null }>;

  // Actions
  openSeparateStems: (trackId: string, title: string) => void;
  closeSeparateStems: () => void;

  openExtend: (track: DisplayTrack) => void;
  closeExtend: () => void;

  openCover: (trackId: string, title: string) => void;
  closeCover: () => void;

  openDelete: (trackId: string, title: string) => void;
  closeDelete: () => void;

  openAddVocal: (trackId: string) => void;
  closeAddVocal: () => void;

  openCreatePersona: (track: DisplayTrack) => void;
  closeCreatePersona: () => void;

  openUpscale: (trackId: string, title: string, audioUrl: string | null) => void;
  closeUpscale: () => void;
}

export const useLibraryDialogs = (): LibraryDialogsState => {
  // Separate Stems Dialog
  const [separateStemsOpen, setSeparateStemsOpen] = useState(false);
  const [selectedTrackForStems, setSelectedTrackForStems] = useState<{ id: string; title: string } | null>(null);

  // Extend Dialog
  const [extendOpen, setExtendOpen] = useState(false);
  const [selectedTrackForExtend, setSelectedTrackForExtend] = useState<DisplayTrack | null>(null);

  // Cover Dialog
  const [coverOpen, setCoverOpen] = useState(false);
  const [selectedTrackForCover, setSelectedTrackForCover] = useState<{ id: string; title: string } | null>(null);

  // Delete Dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedTrackForDelete, setSelectedTrackForDelete] = useState<{ id: string; title: string } | null>(null);

  // Add Vocal Dialog
  const [addVocalOpen, setAddVocalOpen] = useState(false);
  const [selectedTrackForVocal, setSelectedTrackForVocal] = useState<string | null>(null);

  // Create Persona Dialog
  const [createPersonaOpen, setCreatePersonaOpen] = useState(false);
  const [selectedTrackForPersona, setSelectedTrackForPersona] = useState<DisplayTrack | null>(null);

  // Upscale Dialog
  const [upscaleOpen, setUpscaleOpen] = useState(false);
  const [selectedTrackForUpscale, setSelectedTrackForUpscale] = useState<{
    id: string;
    title: string;
    audioUrl: string | null;
  } | null>(null);

  // Callbacks
  const openSeparateStems = useCallback((trackId: string, title: string) => {
    setSelectedTrackForStems({ id: trackId, title });
    setSeparateStemsOpen(true);
  }, []);

  const closeSeparateStems = useCallback(() => {
    setSeparateStemsOpen(false);
    setSelectedTrackForStems(null);
  }, []);

  const openExtend = useCallback((track: DisplayTrack) => {
    setSelectedTrackForExtend(track);
    setExtendOpen(true);
  }, []);

  const closeExtend = useCallback(() => {
    setExtendOpen(false);
    setSelectedTrackForExtend(null);
  }, []);

  const openCover = useCallback((trackId: string, title: string) => {
    setSelectedTrackForCover({ id: trackId, title });
    setCoverOpen(true);
  }, []);

  const closeCover = useCallback(() => {
    setCoverOpen(false);
    setSelectedTrackForCover(null);
  }, []);

  const openDelete = useCallback((trackId: string, title: string) => {
    setSelectedTrackForDelete({ id: trackId, title });
    setDeleteOpen(true);
  }, []);

  const closeDelete = useCallback(() => {
    setDeleteOpen(false);
    setSelectedTrackForDelete(null);
  }, []);

  const openAddVocal = useCallback((trackId: string) => {
    setSelectedTrackForVocal(trackId);
    setAddVocalOpen(true);
  }, []);

  const closeAddVocal = useCallback(() => {
    setAddVocalOpen(false);
    setSelectedTrackForVocal(null);
  }, []);

  const openCreatePersona = useCallback((track: DisplayTrack) => {
    setSelectedTrackForPersona(track);
    setCreatePersonaOpen(true);
  }, []);

  const closeCreatePersona = useCallback(() => {
    setCreatePersonaOpen(false);
    setSelectedTrackForPersona(null);
  }, []);

  const openUpscale = useCallback((trackId: string, title: string, audioUrl: string | null) => {
    setSelectedTrackForUpscale({ id: trackId, title, audioUrl });
    setUpscaleOpen(true);
  }, []);

  const closeUpscale = useCallback(() => {
    setUpscaleOpen(false);
    setSelectedTrackForUpscale(null);
  }, []);

  return {
    separateStems: { isOpen: separateStemsOpen, data: selectedTrackForStems },
    extend: { isOpen: extendOpen, data: selectedTrackForExtend },
    cover: { isOpen: coverOpen, data: selectedTrackForCover },
    delete: { isOpen: deleteOpen, data: selectedTrackForDelete },
    addVocal: { isOpen: addVocalOpen, data: selectedTrackForVocal },
    createPersona: { isOpen: createPersonaOpen, data: selectedTrackForPersona },
    upscale: { isOpen: upscaleOpen, data: selectedTrackForUpscale },

    openSeparateStems,
    closeSeparateStems,
    openExtend,
    closeExtend,
    openCover,
    closeCover,
    openDelete,
    closeDelete,
    openAddVocal,
    closeAddVocal,
    openCreatePersona,
    closeCreatePersona,
    openUpscale,
    closeUpscale,
  };
};
