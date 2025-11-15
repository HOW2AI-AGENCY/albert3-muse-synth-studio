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
    
    // ✅ Транзакционный апдейт через Postgres RPC‑функцию
    // Функция в БД atomically сбрасывает флаги и устанавливает мастер‑версию
    return handleTrackVersionOperation(
      async () => {
        // TEMP FIX: Direct SQL update instead of RPC until types are regenerated
        // Reset all is_preferred_variant flags for this track
        const { error: resetError } = await supabase
          .from('track_versions')
          .update({ is_preferred_variant: false })
          .eq('parent_track_id', parentTrackId);

        if (resetError) {
          return { data: null, error: resetError };
        }

        // Set the new master version
        const { data, error } = await supabase
          .from('track_versions')
          .update({ is_preferred_variant: true })
          .eq('id', versionId)
          .select()
          .single();

        return { data, error };
      },
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
  cover_url?: string;
  video_url?: string;
  videoUrl?: string;
  duration?: number;
  duration_seconds?: number;
  lyric?: string;
  lyrics?: string;
}

export interface TrackMetadata {
  suno_data?: SunoMetadataEntry[];
  [key: string]: unknown;
}

// Interface for the data structure within metadata.suno_data
interface SunoTrackData {
  id: string;
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  cover_url?: string;
  video_url?: string;
  duration?: number;
}

// Type guard to check if data is an array of SunoTrackData
function isSunoDataArray(data: unknown): data is SunoTrackData[] {
  return Array.isArray(data) && data.every(item =>
    typeof item === 'object' && item !== null && 'id' in item
  );
}

/**
 * ✅ REFACTORED: Unified version representation
 * Represents a track variant (NOT the main track)
 * variant_index ALWAYS >= 1 (1, 2, 3...)
 */
export interface TrackVariant {
  /** Unique ID of this variant (from track_versions.id) */
  id: string;
  /** ID of the parent track (from tracks table) */
  parentTrackId: string;
  /** Variant number from DB (1, 2, 3...) - ALWAYS >= 1 */
  variantIndex: number;
  /** Is this the preferred (master) variant? */
  isPreferredVariant: boolean;
  /** Like count for this variant (denormalized) */
  likeCount?: number;
  /** Audio URL for this variant */
  audioUrl?: string;
  /** Cover image URL */
  coverUrl?: string;
  /** Video URL */
  videoUrl?: string;
  /** Duration in seconds */
  duration?: number;
  /** Lyrics for this variant */
  lyrics?: string;
  /** Suno ID for this variant */
  sunoId?: string;
  /** Metadata specific to this variant */
  metadata?: TrackMetadata | null;
  /** Creation timestamp */
  createdAt?: string;
}

/**
 * ✅ NEW: Structured result for track with variants
 * Clearly separates main track from variants
 */
export interface TrackWithVariantsResult {
  /** The main track (from tracks table) */
  mainTrack: {
    id: string;
    title: string;
    audioUrl?: string;
    coverUrl?: string;
    videoUrl?: string;
    duration?: number;
    lyrics?: string;
    styleTags?: string[];
    status?: string;
    userId?: string;
    sunoId?: string;
    metadata?: TrackMetadata | null;
    createdAt?: string;
  };
  /** All variants (variant_index >= 1) */
  variants: TrackVariant[];
  /** The preferred variant (if set), or null */
  preferredVariant: TrackVariant | null;
}

/**
 * @deprecated Use TrackVariant instead
 * Legacy interface for backward compatibility
 */
export interface TrackWithVersions {
  id: string;
  parentTrackId: string;
  /** Отображаемый номер версии в UI (1, 2, 3...) */
  versionNumber: number;
  /** Исходный номер версии из БД (variant_index: 0, 1, 2...) */
  sourceVersionNumber: number | null;
  /** Признак мастер-версии */
  isMasterVersion: boolean;
  /** Количество лайков для этой версии (денормализованное поле) */
  like_count?: number;
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
 * ✅ NEW: Load track with variants (REFACTORED VERSION)
 *
 * Returns structured data:
 * - mainTrack: The primary track from tracks table
 * - variants: Only variants with variant_index >= 1
 * - preferredVariant: The variant marked as preferred, or null
 *
 * Key changes from getTrackWithVersions():
 * - Does NOT create variant_index = 0
 * - Clear separation between main track and variants
 * - No metadata.suno_data fallback (variants must be in DB)
 *
 * @param trackId - The track ID to load
 * @returns Structured result with main track and variants
 */
export async function getTrackWithVariants(trackId: string): Promise<TrackWithVariantsResult | null> {
  try {
    // Load main track
    const { data: mainTrack, error: trackError } = await supabase
      .from('tracks')
      .select('*, suno_id')
      .eq('id', trackId)
      .single<TrackRow>();

    if (trackError) {
      logError('Failed to load main track', trackError as Error, 'trackVersions.getTrackWithVariants', { trackId });
      throw trackError;
    }

    if (!mainTrack) {
      logInfo('Track not found', 'trackVersions.getTrackWithVariants', { trackId });
      return null;
    }

    // Load variants (ONLY variant_index >= 1)
    const { data: dbVersions, error: versionsError } = await supabase
      .from('track_versions')
      .select('*, suno_id')
      .eq('parent_track_id', trackId)
      .gte('variant_index', 1) // ✅ CRITICAL: Only load variants >= 1
      .order('variant_index', { ascending: true })
      .returns<TrackVersionRow[]>();

    if (versionsError) {
      logError('Failed to load variants', versionsError as Error, 'trackVersions.getTrackWithVariants', { trackId });
      throw versionsError;
    }

    // Convert database rows to TrackVariant interface
    const variants: TrackVariant[] = (dbVersions || []).map(version => ({
      id: version.id,
      parentTrackId: mainTrack.id,
      variantIndex: version.variant_index ?? 1,
      isPreferredVariant: Boolean(version.is_preferred_variant),
      likeCount: typeof version.like_count === 'number' ? version.like_count : undefined,
      audioUrl: version.audio_url || undefined,
      coverUrl: version.cover_url || mainTrack.cover_url || undefined,
      videoUrl: version.video_url || undefined,
      duration: version.duration || undefined,
      lyrics: version.lyrics || undefined,
      sunoId: version.suno_id || undefined,
      metadata: (version.metadata as TrackMetadata | null) || null,
      createdAt: version.created_at,
    }));

    // Find preferred variant
    const preferredVariant = variants.find(v => v.isPreferredVariant) || null;

    // Construct result
    const result: TrackWithVariantsResult = {
      mainTrack: {
        id: mainTrack.id,
        title: mainTrack.title,
        audioUrl: mainTrack.audio_url || undefined,
        coverUrl: mainTrack.cover_url || undefined,
        videoUrl: mainTrack.video_url || undefined,
        duration: mainTrack.duration || mainTrack.duration_seconds || undefined,
        lyrics: mainTrack.lyrics || undefined,
        styleTags: mainTrack.style_tags || undefined,
        status: mainTrack.status,
        userId: mainTrack.user_id,
        sunoId: mainTrack.suno_id || undefined,
        metadata: (mainTrack.metadata as TrackMetadata | null) || null,
        createdAt: mainTrack.created_at,
      },
      variants,
      preferredVariant,
    };

    logInfo('Track with variants loaded', 'trackVersions.getTrackWithVariants', {
      trackId,
      variantCount: variants.length,
      hasPreferred: Boolean(preferredVariant),
    });

    return result;
  } catch (error) {
    logError('Failed to load track with variants', error as Error, 'trackVersions.getTrackWithVariants', { trackId });
    throw error;
  }
}

/**
 * @deprecated Use getTrackWithVariants() instead. This function may produce duplicate versions and relies on unstable fallback logic.
 * Legacy function for backward compatibility.
 *
 * Loads a track and all its versions from the database.
 * Returns an array where first element is the main track, followed by all versions.
 *
 * FALLBACK: Если track_versions пустая, пытается извлечь версии из metadata.suno_data
 */
export async function getTrackWithVersions(trackId: string): Promise<TrackWithVersions[]> {
  try {
    const { data: mainTrack, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single<TrackRow>();

    if (trackError) throw trackError;
    if (!mainTrack) return [];

    const { data: dbVersions, error: versionsError } = await supabase
      .from('track_versions')
      .select('*')
      .eq('parent_track_id', trackId)
      .order('variant_index', { ascending: true })
      .returns<TrackVersionRow[]>();

    if (versionsError) throw versionsError;

    // ✅ P0 FIX: Use Map with sourceVersionNumber as key to prevent duplicates
    // This deduplicates by version number, not by ID
    const versionsByNumber = new Map<number, TrackWithVersions>();

    // PRIORITY 1: Load from track_versions table (authoritative source)
    if (dbVersions && dbVersions.length > 0) {
      dbVersions.forEach(version => {
        const versionNum = version.variant_index ?? 0;
        versionsByNumber.set(versionNum, {
          id: version.id,
          parentTrackId: mainTrack.id,
          sourceVersionNumber: versionNum,
          versionNumber: versionNum + 1,
          isMasterVersion: Boolean(version.is_preferred_variant),
          like_count: typeof version.like_count === 'number' ? version.like_count : undefined,
          title: mainTrack.title,
          audio_url: version.audio_url || undefined,
          cover_url: version.cover_url || mainTrack.cover_url || undefined,
          video_url: version.video_url || undefined,
          duration: version.duration || undefined,
          lyrics: version.lyrics || undefined,
          style_tags: mainTrack.style_tags || undefined,
          status: 'completed',
          user_id: mainTrack.user_id,
          metadata: (version.metadata as TrackMetadata | null) || (mainTrack.metadata as TrackMetadata | null),
          suno_id: version.suno_id || undefined,
          created_at: version.created_at,
        });
      });
    }

    // PRIORITY 2: Merge with metadata.suno_data for versions not yet in DB
    // ✅ FIX: Always check metadata for additional versions, not just when track_versions is empty
    // This allows showing versions from polling before they're fully persisted to track_versions
    if (
      mainTrack.metadata &&
      typeof mainTrack.metadata === 'object' &&
      'suno_data' in mainTrack.metadata &&
      isSunoDataArray(mainTrack.metadata.suno_data) &&
      mainTrack.metadata.suno_data.length > 0
    ) {
      // Collect suno_ids already in DB to avoid duplicates
      const existingSunoIds = new Set<string>();
      versionsByNumber.forEach(v => {
        if (v.suno_id) {
          existingSunoIds.add(v.suno_id);
        }
      });

      mainTrack.metadata.suno_data.forEach((versionData, index) => {
        const audioUrl = versionData.audio_url || versionData.stream_audio_url;
        if (!audioUrl) return;

        // Skip if this suno_id already exists in DB
        if (versionData.id && existingSunoIds.has(versionData.id)) {
          return;
        }

        // Only add if this variant_index slot is empty
        if (!versionsByNumber.has(index)) {
          versionsByNumber.set(index, {
            id: versionData.id,
            parentTrackId: mainTrack.id,
            sourceVersionNumber: index,
            versionNumber: index + 1,
            isMasterVersion: false, // will be corrected later
            title: mainTrack.title,
            audio_url: audioUrl,
            // ✅ FIX: Support both cover_url and image_url for compatibility
            cover_url: versionData.cover_url || versionData.image_url || mainTrack.cover_url || undefined,
            video_url: versionData.video_url || undefined,
            duration: versionData.duration || undefined,
            lyrics: mainTrack.lyrics || undefined,
            style_tags: mainTrack.style_tags || undefined,
            status: 'completed',
            user_id: mainTrack.user_id,
            metadata: mainTrack.metadata as TrackMetadata | null,
            suno_id: versionData.id,
            created_at: mainTrack.created_at,
          });
        }
      });
    }

    // PRIORITY 3: Add main track as version 0 ONLY if not already present
    const hasVersionZero = versionsByNumber.has(0);
    if (mainTrack.audio_url && !hasVersionZero) {
      versionsByNumber.set(0, {
        id: mainTrack.id,
        parentTrackId: mainTrack.id,
        sourceVersionNumber: 0,
        versionNumber: 1,
        isMasterVersion: true, // by default, can be overridden
        title: mainTrack.title,
        audio_url: mainTrack.audio_url,
        cover_url: mainTrack.cover_url || undefined,
        video_url: mainTrack.video_url || undefined,
        duration: mainTrack.duration || mainTrack.duration_seconds || undefined,
        lyrics: mainTrack.lyrics || undefined,
        style_tags: mainTrack.style_tags || undefined,
        status: mainTrack.status,
        user_id: mainTrack.user_id,
        metadata: mainTrack.metadata as TrackMetadata | null,
        suno_id: mainTrack.suno_id || undefined,
        created_at: mainTrack.created_at,
      });
    }

    // ✅ P0 FIX: Convert Map to Array - guaranteed no duplicates by sourceVersionNumber
    const normalizedVersions = Array.from(versionsByNumber.values());

    // Designate master version
    const masterVersion = normalizedVersions.find(v => v.isMasterVersion);
    if (!masterVersion && normalizedVersions.length > 0) {
      const firstVersionWithAudio = normalizedVersions.find(v => v.audio_url);
      if (firstVersionWithAudio) {
        firstVersionWithAudio.isMasterVersion = true;
      }
    }

    normalizedVersions.sort((a, b) => 
      (a.sourceVersionNumber ?? 0) - (b.sourceVersionNumber ?? 0)
    );

    logInfo('Track versions loaded (deduplicated)', 'trackVersions', {
      trackId,
      dbVersionsCount: dbVersions?.length || 0,
      metadataVersionsCount: (mainTrack.metadata as any)?.suno_data?.length || 0,
      normalizedVersionsCount: normalizedVersions.length,
      versionNumbers: normalizedVersions.map(v => v.sourceVersionNumber).sort(),
    });

    return normalizedVersions;
  } catch (error) {
    logError('Ошибка получения треков с версиями', error as Error, 'trackVersions', {
      trackId
    });
    return [];
  }
}


/**
 * ✅ NEW: Get preferred variant from array of variants
 * @param variants - Array of TrackVariant objects
 * @returns The preferred variant, or null if none is marked as preferred
 */
export function getPreferredVariant(variants: TrackVariant[]): TrackVariant | null {
  if (!variants || variants.length === 0) return null;
  return variants.find(v => v.isPreferredVariant) || null;
}

/**
 * ✅ NEW: Check if a track has variants
 * @param variants - Array of TrackVariant objects
 * @returns True if there are any variants (variant_index >= 1)
 */
export function hasVariants(variants: TrackVariant[]): boolean {
  return variants && variants.length > 0;
}

/**
 * ✅ NEW: Convert legacy TrackWithVersions[] to new format
 * Helper for gradual migration
 */
export function convertLegacyVersionsToVariants(
  legacyVersions: TrackWithVersions[]
): { mainTrack: TrackWithVersions | null; variants: TrackWithVersions[] } {
  if (!legacyVersions || legacyVersions.length === 0) {
    return { mainTrack: null, variants: [] };
  }

  // Find version 0 (main track)
  const mainTrack = legacyVersions.find(v => v.sourceVersionNumber === 0) || legacyVersions[0];

  // Filter variants (sourceVersionNumber >= 1)
  const variants = legacyVersions.filter(v => v.sourceVersionNumber !== null && v.sourceVersionNumber >= 1);

  return { mainTrack, variants };
}

/**
 * @deprecated Use getPreferredVariant() instead
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
 * @deprecated Use hasVariants() instead
 * Checks if a track has multiple versions
 */
export function hasMultipleVersions(tracks: TrackWithVersions[]): boolean {
  if (!tracks) {
    return false;
  }

  return tracks.length > 1;
}

/**
 * ✅ NEW: React Query keys for track variants
 */
export const trackVersionsQueryKeys = {
  all: ['track-variants'] as const,
  lists: () => [...trackVersionsQueryKeys.all, 'list'] as const,
  list: (trackId: string) => [...trackVersionsQueryKeys.lists(), trackId] as const,
};
