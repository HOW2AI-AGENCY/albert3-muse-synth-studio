/**
 * Унифицированные типы для системы вариантов треков
 * Phase 1.1 - Новая терминология
 */

export interface TrackVariant {
  id: string;
  parentTrackId: string;
  /** Порядковый номер варианта (0 для первичного, 1+ для альтернатив) */
  variantIndex: number;
  /** Исходный номер из БД */
  sourceVariantIndex: number | null;
  /** Первичный (оригинальный) вариант */
  isPrimaryVariant: boolean;
  /** Предпочтительный (мастер) вариант */
  isPreferredVariant: boolean;
  title: string;
  audio_url?: string;
  cover_url?: string;
  video_url?: string;
  duration?: number;
  lyrics?: string;
  suno_id?: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

export interface VariantActionHandlers {
  onPlay: (variantId: string) => void;
  onSetPreferred: (variantId: string) => void;
  onExtend?: (trackId: string, variantId: string) => void;
  onCover?: (trackId: string, variantId: string) => void;
  onSeparateStems?: (trackId: string, variantId: string) => void;
  onSetAsReference?: (variantId: string) => void;
  onDelete: (variantId: string) => void;
}
