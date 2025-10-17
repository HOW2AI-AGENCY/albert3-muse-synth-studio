/**
 * Provider Types and Interfaces
 * Unified abstraction layer for music generation providers
 */

export type MusicProvider = 'suno' | 'mureka';

export interface ProviderCapabilities {
  generateMusic: boolean;
  extendTrack: boolean;
  separateStems: boolean;
  generateLyrics: boolean;
  recognizeSong?: boolean;
  describeSong?: boolean;
  createCover?: boolean;
}

export interface ProviderConfig {
  id: MusicProvider;
  name: string;
  displayName: string;
  version: string;
  capabilities: ProviderCapabilities;
  pricing: {
    costPerGeneration: number;
    currency: string;
  };
  limits: {
    maxDuration: number; // seconds
    maxConcurrent: number;
  };
}

export interface GenerationParams {
  prompt: string;
  title?: string;
  lyrics?: string;
  duration?: number;
  style?: string;
  styleTags?: string[];
  referenceAudio?: string;
  referenceTrackId?: string;
  hasVocals?: boolean;
  makeInstrumental?: boolean;
  modelVersion?: string;
  negativeTags?: string;
  vocalGender?: 'm' | 'f' | 'any';
  audioWeight?: number;
  styleWeight?: number;
  lyricsWeight?: number;
  weirdness?: number;
  customMode?: boolean;
  isBGM?: boolean;
  idempotencyKey?: string;
  trackId?: string;
}

export interface ExtensionParams {
  originalTrackId: string;
  originalTaskId?: string;
  prompt: string;
  duration?: number;
  continueAt?: number;
}

export interface StemSeparationParams {
  trackId: string;
  audioId: string;
  separationType: 'separate_vocal' | 'split_stem';
}

export interface GenerationResult {
  taskId: string;
  trackId?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  tracks?: TrackData[];
  message?: string;
}

export interface TrackData {
  id: string;
  title: string;
  audioUrl?: string;
  coverUrl?: string;
  videoUrl?: string;
  duration?: number;
  lyrics?: string;
}

export interface TaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  audioUrl?: string;
  coverUrl?: string;
  videoUrl?: string;
  errorMessage?: string;
}

export interface BalanceInfo {
  balance: number;
  currency: string;
  details?: any;
}
