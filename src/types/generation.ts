import type { MusicProvider } from '@/config/provider-models';

/**
 * DTO for the 'generate-suno' Edge Function
 * Contains only the fields expected by the backend Zod schema
 */
export interface SunoRequestDTO {
  trackId?: string;
  prompt?: string;
  tags?: string[];
  title?: string;
  make_instrumental?: boolean;
  model_version?: string;
  lyrics?: string | null;
  hasVocals?: boolean;
  customMode?: boolean;
  negativeTags?: string;
  vocalGender?: 'm' | 'f';
  styleWeight?: number;
  weirdnessConstraint?: number;
  audioWeight?: number;
  referenceAudioUrl?: string;
  referenceTrackId?: string;
  idempotencyKey?: string;
  wait_audio?: boolean;
  projectId?: string;
  personaId?: string;
}
