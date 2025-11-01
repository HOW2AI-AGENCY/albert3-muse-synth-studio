/**
 * Consolidated state management for MusicGeneratorV2
 */
import { useState, useCallback } from 'react';
import type { GenerationParams, GeneratorMode } from '@/components/generator/types/generator.types';

export interface GeneratorState {
  // UI State
  mode: GeneratorMode;
  audioPreviewOpen: boolean;
  lyricsDialogOpen: boolean;
  historyDialogOpen: boolean;
  showPresets: boolean;
  pendingAudioFile: File | null;
  murekaLyricsDialog: {
    open: boolean;
    trackId: string;
    jobId: string;
  };
  
  // AI Enhancement state
  enhancedPrompt: {
    enhanced: string;
    addedElements: string[];
    reasoning: string;
  } | null;
  isEnhancing: boolean;
  
  // Generation params
  params: GenerationParams;
  debouncedPrompt: string;
  debouncedLyrics: string;
}

export interface GeneratorStateActions {
  setMode: (mode: GeneratorMode) => void;
  setAudioPreviewOpen: (open: boolean) => void;
  setLyricsDialogOpen: (open: boolean) => void;
  setHistoryDialogOpen: (open: boolean) => void;
  setShowPresets: (show: boolean) => void;
  setPendingAudioFile: (file: File | null) => void;
  setMurekaLyricsDialog: (dialog: GeneratorState['murekaLyricsDialog']) => void;
  setEnhancedPrompt: (prompt: GeneratorState['enhancedPrompt']) => void;
  setIsEnhancing: (isEnhancing: boolean) => void;
  setParams: (params: GenerationParams | ((prev: GenerationParams) => GenerationParams)) => void;
  setParam: <K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => void;
  setDebouncedPrompt: (prompt: string) => void;
  setDebouncedLyrics: (lyrics: string) => void;
}

export type UseGeneratorStateReturn = GeneratorState & GeneratorStateActions;

export const useGeneratorState = (
  selectedProvider: string
): UseGeneratorStateReturn => {
  // UI State
  const [mode, setMode] = useState<GeneratorMode>('simple');
  const [audioPreviewOpen, setAudioPreviewOpen] = useState(false);
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [murekaLyricsDialog, setMurekaLyricsDialog] = useState({
    open: false,
    trackId: '',
    jobId: ''
  });
  
  // AI Enhancement state
  const [enhancedPrompt, setEnhancedPrompt] = useState<{
    enhanced: string;
    addedElements: string[];
    reasoning: string;
  } | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  
  // Generation params
  const [params, setParams] = useState<GenerationParams>({
    prompt: '',
    title: '',
    lyrics: '',
    tags: '',
    negativeTags: '',
    vocalGender: 'any',
    modelVersion: selectedProvider === 'mureka' ? 'auto' : 'V5',
    referenceAudioUrl: null,
    referenceFileName: null,
    referenceTrackId: null,
    audioWeight: 50,
    styleWeight: 75,
    lyricsWeight: 70,
    weirdnessConstraint: 10,
    provider: selectedProvider,
    personaId: null, // ✅ НОВОЕ: персона по умолчанию не выбрана
  });

  const setParam = useCallback(<K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Debounced state for textarea inputs
  const [debouncedPrompt, setDebouncedPrompt] = useState(params.prompt);
  const [debouncedLyrics, setDebouncedLyrics] = useState(params.lyrics);

  return {
    // State
    mode,
    audioPreviewOpen,
    lyricsDialogOpen,
    historyDialogOpen,
    showPresets,
    pendingAudioFile,
    murekaLyricsDialog,
    enhancedPrompt,
    isEnhancing,
    params,
    debouncedPrompt,
    debouncedLyrics,
    
    // Actions
    setMode,
    setAudioPreviewOpen,
    setLyricsDialogOpen,
    setHistoryDialogOpen,
    setShowPresets,
    setPendingAudioFile,
    setMurekaLyricsDialog,
    setEnhancedPrompt,
    setIsEnhancing,
    setParams,
    setParam,
    setDebouncedPrompt,
    setDebouncedLyrics,
  };
};
