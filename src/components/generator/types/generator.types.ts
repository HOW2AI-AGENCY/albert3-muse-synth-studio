/**
 * Типы и интерфейсы для Music Generator V2
 * @module generator.types
 */

export type VocalGender = 'any' | 'female' | 'male' | 'instrumental';
export type GeneratorMode = 'simple' | 'custom';

export interface GenerationParams {
  prompt: string;
  title: string;
  lyrics: string;
  tags: string;
  negativeTags: string;
  vocalGender: VocalGender;
  modelVersion: string;
  referenceAudioUrl: string | null;
  referenceFileName: string | null;
  audioWeight: number;
  styleWeight: number;
  lyricsWeight: number;
  weirdness: number;
  provider: string;
}

export interface GeneratorUIState {
  mode: GeneratorMode;
  audioPreviewOpen: boolean;
  lyricsDialogOpen: boolean;
  historyDialogOpen: boolean;
  showPresets: boolean;
  pendingAudioFile: File | null;
}

export interface GenrePreset {
  styleTags: string[];
  mood?: string;
  promptSuggestion: string;
}

export const VOCAL_GENDER_OPTIONS: { value: VocalGender; label: string }[] = [
  { value: 'any', label: 'Любой' },
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
  { value: 'instrumental', label: 'Без вокала' },
];
