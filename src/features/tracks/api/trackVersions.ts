import type { PostgrestError } from '@supabase/supabase-js';

import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

type TrackRow = Database['public']['Tables']['tracks']['Row'];
type TrackVersionRow = Database['public']['Tables']['track_versions']['Row'];
type TrackVersionInsert = Database['public']['Tables']['track_versions']['Insert'];
type TrackVersionUpdate = Database['public']['Tables']['track_versions']['Update'];

const TRACK_VERSIONS_CONTEXT = 'trackVersionsApi';

export type Result<T, E extends Error = TrackVersionError> =
  | { ok: true; data: T }
  | { ok: false; error: E };

export class TrackVersionError extends Error {
  constructor(
    message: string,
    public readonly context: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'TrackVersionError';
  }
}

export class TrackVersionNotFoundError extends TrackVersionError {
  constructor(context: string, public readonly versionId: string) {
    super(`Track version with id "${versionId}" not found`, context);
    this.name = 'TrackVersionNotFoundError';
  }
}

interface OperationOptions {
  action: string;
  errorMessage: string;
  payload?: Record<string, unknown>;
  notFoundError?: () => TrackVersionError;
}

async function handleTrackVersionOperation<T>(
  operation: () => Promise<{ data: T | null; error: PostgrestError | null }>,
  { action, errorMessage, payload, notFoundError }: OperationOptions,
): Promise<Result<T>> {
  const context = `${TRACK_VERSIONS_CONTEXT}.${action}`;

  const { data, error } = await operation();

  if (error) {
    const operationError = new TrackVersionError(errorMessage, context, error);
    logError(errorMessage, operationError, context, {
      ...payload,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    return { ok: false, error: operationError };
  }

  if (!data) {
    const missingError = notFoundError?.() ?? new TrackVersionError(errorMessage, context);
    logError(errorMessage, missingError, context, payload);
    throw missingError;
  }

  return { ok: true, data };
}

export function unwrapResult<T, E extends Error = TrackVersionError>(result: Result<T, E>): T {
  if (!result.ok) {
    throw result.error;
  }

  return result.data;
}

export async function createTrackVersion(payload: TrackVersionInsert): Promise<Result<TrackVersionRow>> {
  return handleTrackVersionOperation(
    async () =>
      supabase
        .from('track_versions')
        .insert(payload)
        .select()
        .single<TrackVersionRow>(),
    {
      action: 'create',
      errorMessage: 'Failed to create track version',
      payload: {
        parentTrackId: payload.parent_track_id,
        variantIndex: payload.variant_index,
        hasAudioUrl: Boolean(payload.audio_url),
      },
    },
  );
}

export async function updateTrackVersion(
  versionId: string,
  updates: TrackVersionUpdate,
): Promise<Result<TrackVersionRow>> {
  return handleTrackVersionOperation(
    async () =>
      supabase
        .from('track_versions')
        .update(updates)
        .eq('id', versionId)
        .select()
        .single<TrackVersionRow>(),
    {
      action: 'update',
      errorMessage: 'Failed to update track version',
      payload: {
        versionId,
        updates,
      },
      notFoundError: () => new TrackVersionNotFoundError(`${TRACK_VERSIONS_CONTEXT}.update`, versionId),
    },
  );
}

/**
 * Установить версию как мастер-версию трека
 * Автоматически снимает флаг is_preferred_variant с других версий этого трека
 */
export async function setMasterVersion(
  parentTrackId: string,
  versionId: string
): Promise<Result<TrackVersionRow>> {
  const context = `${TRACK_VERSIONS_CONTEXT}.setMasterVersion`;
  
  try {
    logInfo('Setting master version', context, { parentTrackId, versionId });
    
    // 1. Сбросить is_preferred_variant для всех версий этого трека
    const { error: resetError } = await supabase
      .from('track_versions')
      .update({ is_preferred_variant: false })
      .eq('parent_track_id', parentTrackId);
    
    if (resetError) {
      const error = new TrackVersionError('Failed to reset preferred variants', context, resetError);
      logError('Failed to reset preferred variants', error, context, { parentTrackId });
      return { ok: false, error };
    }
    
    // 2. Установить is_preferred_variant: true для выбранной версии
    return handleTrackVersionOperation(
      async () =>
        supabase
          .from('track_versions')
          .update({ is_preferred_variant: true })
          .eq('id', versionId)
          .select()
          .single<TrackVersionRow>(),
      {
        action: 'setMasterVersion',
        errorMessage: 'Failed to set master version',
        payload: { parentTrackId, versionId },
        notFoundError: () => new TrackVersionNotFoundError(context, versionId),
      }
    );
  } catch (error) {
    const operationError = new TrackVersionError(
      'Failed to set master version',
      context,
      error
    );
    logError('Failed to set master version', operationError, context, { parentTrackId, versionId });
    return { ok: false, error: operationError };
  }
}

export async function deleteTrackVersion(versionId: string): Promise<Result<TrackVersionRow>> {
  return handleTrackVersionOperation(
    async () =>
      supabase
        .from('track_versions')
        .delete()
        .eq('id', versionId)
        .select()
        .single<TrackVersionRow>(),
    {
      action: 'delete',
      errorMessage: 'Failed to delete track version',
      payload: {
        versionId,
      },
      notFoundError: () => new TrackVersionNotFoundError(`${TRACK_VERSIONS_CONTEXT}.delete`, versionId),
    },
  );
}

interface SunoMetadataEntry {
  id?: string;
  audioUrl?: string;
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  imageUrl?: string;
  video_url?: string;
  videoUrl?: string;
  duration?: number;
  duration_seconds?: number;
  lyric?: string;
  lyrics?: string;
}

interface TrackMetadata {
  suno_data?: SunoMetadataEntry[];
  [key: string]: unknown;
}

// Interface for the data structure within metadata.suno_data
interface SunoTrackData {
  id: string;
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  video_url?: string;
  duration?: number;
}

// Type guard to check if data is an array of SunoTrackData
function isSunoDataArray(data: unknown): data is SunoTrackData[] {
  return Array.isArray(data) && data.every(item =>
    typeof item === 'object' && item !== null && 'id' in item
  );
}

export interface TrackWithVersions {
  id: string;
  parentTrackId: string;
  /** Отображаемый номер версии в UI (1, 2, 3...) */
  versionNumber: number;
  /** Исходный номер версии из БД (variant_index: 0, 1, 2...) */
  sourceVersionNumber: number | null;
  /** Признак мастер-версии */
  isMasterVersion: boolean;
  title: string;
  audio_url?: string;
  cover_url?: string;
  video_url?: string;
  duration?: number;
  lyrics?: string;
  style_tags?: string[];
  artist?: string;
  status?: string;
  user_id?: string;
  metadata?: TrackMetadata | null;
  suno_id?: string;
  created_at?: string;
}

/**
 * Loads a track and all its versions from the database
 * Returns an array where first element is the main track, followed by all versions
 * 
 * FALLBACK: Если track_versions пустая, пытается извлечь версии из metadata.suno_data
 */
export async function getTrackWithVersions(trackId: string): Promise<TrackWithVersions[]> {
  try {
    // Load the main track, including its metadata
    const { data: mainTrack, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single<TrackRow>();

    if (trackError) throw trackError;
    if (!mainTrack) return [];

    // Load all versions of this track from the dedicated versions table
    const { data: versions, error: versionsError } = await supabase
      .from('track_versions')
      .select('*')
      .eq('parent_track_id', trackId)
      .order('variant_index', { ascending: true })
      .returns<TrackVersionRow[]>();

    if (versionsError) throw versionsError;

    const normalizedVersions: TrackWithVersions[] = [];

    const pushVersion = (payload: {
      id: string;
      sourceVersionNumber: number | null;
      isMasterVersion: boolean;
      title: string;
      audio_url?: string | null;
      cover_url?: string | null;
      video_url?: string | null;
      duration?: number | null;
      lyrics?: string | null;
      metadata?: TrackMetadata | null;
      created_at?: string | null;
      suno_id?: string | null;
      status?: string | null;
    }) => {
      // ✅ НОВАЯ ЛОГИКА: versionNumber = sourceVersionNumber + 1 (1, 2, 3...)
      const versionNumber = (payload.sourceVersionNumber ?? 0) + 1;
      
      normalizedVersions.push({
        id: payload.id,
        parentTrackId: mainTrack.id,
        versionNumber,
        sourceVersionNumber: payload.sourceVersionNumber,
        isMasterVersion: payload.isMasterVersion,
        title: payload.title,
        audio_url: payload.audio_url ?? undefined,
        cover_url: payload.cover_url ?? undefined,
        video_url: payload.video_url ?? undefined,
        duration: payload.duration ?? undefined,
        lyrics: payload.lyrics ?? undefined,
        style_tags: mainTrack.style_tags ?? undefined,
        artist: undefined,
        status: payload.status ?? mainTrack.status ?? undefined,
        user_id: mainTrack.user_id,
        metadata: payload.metadata ?? ((mainTrack.metadata as TrackMetadata | null) ?? null),
        suno_id: payload.suno_id ?? mainTrack.suno_id ?? undefined,
        created_at: payload.created_at ?? mainTrack.created_at ?? undefined,
      });
    };

    // ✅ ИСПРАВЛЕНИЕ: Добавить mainTrack как версию V1, если нужно
    if (!versions || versions.length === 0) {
      // Случай 1: Нет версий в track_versions → добавить mainTrack как V1
      if (mainTrack.audio_url) {
        pushVersion({
          id: mainTrack.id,
          sourceVersionNumber: 0,
          isMasterVersion: true,
          title: mainTrack.title,
          audio_url: mainTrack.audio_url,
          cover_url: mainTrack.cover_url ?? null,
          video_url: mainTrack.video_url ?? null,
          duration: mainTrack.duration ?? mainTrack.duration_seconds ?? null,
          lyrics: mainTrack.lyrics ?? null,
          metadata: (mainTrack.metadata as TrackMetadata | null) ?? null,
          created_at: mainTrack.created_at ?? null,
          suno_id: mainTrack.suno_id ?? null,
          status: mainTrack.status ?? 'completed',
        });
      }
    } else if (versions.length === 1 && (versions[0].variant_index ?? 0) >= 1) {
      // Случай 2: Есть 1 версия с variant_index >= 1 (Mureka)
      // → добавить mainTrack как V1 (variant_index: 0)
      if (mainTrack.audio_url) {
        pushVersion({
          id: mainTrack.id,
          sourceVersionNumber: 0,
          isMasterVersion: false, // Версия из track_versions — мастер
          title: mainTrack.title,
          audio_url: mainTrack.audio_url,
          cover_url: mainTrack.cover_url ?? null,
          video_url: mainTrack.video_url ?? null,
          duration: mainTrack.duration ?? mainTrack.duration_seconds ?? null,
          lyrics: mainTrack.lyrics ?? null,
          metadata: (mainTrack.metadata as TrackMetadata | null) ?? null,
          created_at: mainTrack.created_at ?? null,
          suno_id: mainTrack.suno_id ?? null,
          status: mainTrack.status ?? 'completed',
        });
      }
      
      // Добавить версию из track_versions
      versions.forEach((version: TrackVersionRow) => {
        pushVersion({
          id: version.id,
          sourceVersionNumber: version.variant_index ?? null,
          isMasterVersion: Boolean(version.is_preferred_variant),
          title: mainTrack.title,
          audio_url: version.audio_url ?? null,
          cover_url: version.cover_url ?? mainTrack.cover_url ?? null,
          video_url: version.video_url ?? null,
          duration: version.duration ?? null,
          lyrics: version.lyrics ?? null,
          metadata: (version.metadata as TrackMetadata | null) ?? null,
          created_at: version.created_at ?? null,
          suno_id: version.suno_id ?? null,
          status: 'completed',
        });
      });
    } else {
      // Случай 3: Несколько версий (Suno) → добавить все из track_versions
      
      // ✅ FIX: Проверить, есть ли версия с variant_index: 0
      const hasVariantZero = versions.some(v => (v.variant_index ?? -1) === 0);
      
      if (!hasVariantZero && mainTrack.audio_url) {
        // Если нет версии с variant_index: 0, добавить mainTrack как V1
        pushVersion({
          id: mainTrack.id,
          sourceVersionNumber: 0,
          isMasterVersion: false, // Мастер-версия определяется из track_versions
          title: mainTrack.title,
          audio_url: mainTrack.audio_url,
          cover_url: mainTrack.cover_url ?? null,
          video_url: mainTrack.video_url ?? null,
          duration: mainTrack.duration ?? mainTrack.duration_seconds ?? null,
          lyrics: mainTrack.lyrics ?? null,
          metadata: (mainTrack.metadata as TrackMetadata | null) ?? null,
          created_at: mainTrack.created_at ?? null,
          suno_id: mainTrack.suno_id ?? null,
          status: mainTrack.status ?? 'completed',
        });
      }
      
      // Добавить все версии из track_versions
      versions.forEach((version: TrackVersionRow) => {
        pushVersion({
          id: version.id,
          sourceVersionNumber: version.variant_index ?? null,
          isMasterVersion: Boolean(version.is_preferred_variant),
          title: mainTrack.title,
          audio_url: version.audio_url ?? null,
          cover_url: version.cover_url ?? mainTrack.cover_url ?? null,
          video_url: version.video_url ?? null,
          duration: version.duration ?? null,
          lyrics: version.lyrics ?? null,
          metadata: (version.metadata as TrackMetadata | null) ?? null,
          created_at: version.created_at ?? null,
          suno_id: version.suno_id ?? null,
          status: 'completed',
        });
      });
    }

    // ✅ Логирование для отладки
    logInfo('Track versions loaded', 'trackVersions', {
      trackId,
      dbVersionsCount: versions?.length || 0,
      normalizedVersionsCount: normalizedVersions.length,
      case: !versions || versions.length === 0 ? 1 : 
            versions.length === 1 && (versions[0].variant_index ?? 0) >= 1 ? 2 : 3,
      hasMainTrackAudio: !!mainTrack.audio_url,
    });

    // ✅ Сортировка по sourceVersionNumber (0 → 1 → 2...)
    normalizedVersions.sort((a, b) => 
      (a.sourceVersionNumber ?? 0) - (b.sourceVersionNumber ?? 0)
    );

    if (
      mainTrack.metadata &&
      typeof mainTrack.metadata === 'object' &&
      'suno_data' in mainTrack.metadata &&
      isSunoDataArray(mainTrack.metadata.suno_data)
    ) {
      const sunoData = mainTrack.metadata.suno_data as SunoTrackData[];
      if (sunoData.length > 1) {
        logInfo('Using fallback to extract versions from metadata', 'trackVersions', { trackId });

        sunoData.slice(1).forEach((versionData: SunoTrackData, index: number) => {
          // ✅ ИСПРАВЛЕНО: Правильный приоритет URL
          const audioUrl = versionData.audio_url 
            || versionData.stream_audio_url 
            || null;
          
          // ✅ Пропустить версии без аудио
          if (!audioUrl) {
            logInfo('Skipping version without audio', 'trackVersions', { versionId: versionData.id });
            return;
          }
          
          pushVersion({
            id: versionData.id,
            sourceVersionNumber: index,
            isMasterVersion: false,
            title: mainTrack.title,
            audio_url: audioUrl,
            cover_url: versionData.image_url ?? mainTrack.cover_url ?? null,
            video_url: versionData.video_url ?? null,
            duration: versionData.duration ?? null,
            lyrics: mainTrack.lyrics ?? null,
            metadata: (mainTrack.metadata as TrackMetadata | null) ?? null,
            created_at: null,
            suno_id: null,
            status: 'completed',
          });
        });
      }
    }

    return normalizedVersions;
  } catch (error) {
    logError('Ошибка получения треков с версиями', error as Error, 'trackVersions', {
      trackId
    });
    return [];
  }
}

/**
 * Gets the master version of a track (or main track if no master is set)
 */
export function getMasterVersion(tracks: TrackWithVersions[]): TrackWithVersions | null {
  if (!tracks || tracks.length === 0) return null;

  // ✅ Найти версию с isMasterVersion: true
  const master = tracks.find(t => t.isMasterVersion);
  if (master) return master;

  // ✅ Fallback: первая версия
  return tracks[0];
}

/**
 * Checks if a track has multiple versions
 */
export function hasMultipleVersions(tracks: TrackWithVersions[]): boolean {
  if (!tracks) {
    return false;
  }

  return tracks.length > 1;
}
