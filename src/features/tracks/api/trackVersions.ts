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

export async function setMasterVersion(
  parentTrackId: string,
  versionId: string
): Promise<Result<TrackVersionRow>> {
  const context = `${TRACK_VERSIONS_CONTEXT}.setMasterVersion`;
  
  try {
    logInfo('Setting master version', context, { parentTrackId, versionId });
    
    return handleTrackVersionOperation(
      async () => {
        const { error: resetError } = await supabase
          .from('track_versions')
          .update({ is_preferred_variant: false })
          .eq('parent_track_id', parentTrackId);

        if (resetError) {
          return { data: null, error: resetError };
        }

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

interface SunoTrackData {
  id: string;
  audio_url?: string;
  stream_audio_url?: string;
  image_url?: string;
  cover_url?: string;
  video_url?: string;
  duration?: number;
}

function isSunoDataArray(data: unknown): data is SunoTrackData[] {
  return Array.isArray(data) && data.every(item =>
    typeof item === 'object' && item !== null && 'id' in item
  );
}

export interface TrackVariant {
  id: string;
  parentTrackId: string;
  variantIndex: number;
  isPreferredVariant: boolean;
  likeCount?: number;
  audioUrl?: string;
  coverUrl?: string;
  videoUrl?: string;
  duration?: number;
  lyrics?: string;
  sunoId?: string;
  metadata?: TrackMetadata | null;
  createdAt?: string;
}

export interface TrackWithVariantsResult {
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
  variants: TrackVariant[];
  preferredVariant: TrackVariant | null;
}

export interface TrackWithVersions {
  id: string;
  parentTrackId: string;
  versionNumber: number;
  sourceVersionNumber: number | null;
  isMasterVersion: boolean;
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

export async function getTrackWithVariants(trackId: string): Promise<TrackWithVariantsResult | null> {
  try {
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

    const { data: dbVersions, error: versionsError } = await supabase
      .from('track_versions')
      .select('*, suno_id')
      .eq('parent_track_id', trackId)
      .gte('variant_index', 1)
      .order('variant_index', { ascending: true })
      .returns<TrackVersionRow[]>();

    if (versionsError) {
      logError('Failed to load variants', versionsError as Error, 'trackVersions.getTrackWithVariants', { trackId });
      throw versionsError;
    }

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

    const preferredVariant = variants.find(v => v.isPreferredVariant) || null;

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
 * ✅ FIXME: This function is the source of the duration/length bug. It has been refactored for safety.
 * It now includes defensive checks, clear data normalization, and enhanced logging.
 */
export async function getTrackWithVersions(trackId: string): Promise<TrackWithVersions[]> {
  const context = 'trackVersions.getTrackWithVersions';
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

    const versionsByNumber = new Map<number, TrackWithVersions>();

    if (dbVersions && dbVersions.length > 0) {
      dbVersions.forEach(version => {
        const versionNum = version.variant_index ?? 0;
        // ✅ Defensive check for duration
        const duration = typeof version.duration === 'number' ? version.duration : undefined;

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
          duration,
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

    if (
      mainTrack.metadata &&
      typeof mainTrack.metadata === 'object' &&
      'suno_data' in mainTrack.metadata &&
      isSunoDataArray(mainTrack.metadata.suno_data) &&
      mainTrack.metadata.suno_data.length > 0
    ) {
      const existingSunoIds = new Set<string>();
      versionsByNumber.forEach(v => {
        if (v.suno_id) existingSunoIds.add(v.suno_id);
      });

      mainTrack.metadata.suno_data.forEach((versionData, index) => {
        const audioUrl = versionData.audio_url || versionData.stream_audio_url;
        if (!audioUrl || (versionData.id && existingSunoIds.has(versionData.id))) {
          return;
        }

        if (!versionsByNumber.has(index)) {
          // ✅ Defensive check for duration from metadata
          const duration = typeof versionData.duration === 'number' ? versionData.duration : undefined;

          versionsByNumber.set(index, {
            id: versionData.id,
            parentTrackId: mainTrack.id,
            sourceVersionNumber: index,
            versionNumber: index + 1,
            isMasterVersion: false,
            title: mainTrack.title,
            audio_url: audioUrl,
            cover_url: versionData.cover_url || versionData.image_url || mainTrack.cover_url || undefined,
            video_url: versionData.video_url || undefined,
            duration,
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

    if (mainTrack.audio_url && !versionsByNumber.has(0)) {
       // ✅ Defensive check for main track duration
      const duration = typeof mainTrack.duration_seconds === 'number'
        ? mainTrack.duration_seconds
        : typeof mainTrack.duration === 'number'
        ? mainTrack.duration
        : undefined;

      versionsByNumber.set(0, {
        id: mainTrack.id,
        parentTrackId: mainTrack.id,
        sourceVersionNumber: 0,
        versionNumber: 1,
        isMasterVersion: true,
        title: mainTrack.title,
        audio_url: mainTrack.audio_url,
        cover_url: mainTrack.cover_url || undefined,
        video_url: mainTrack.video_url || undefined,
        duration,
        lyrics: mainTrack.lyrics || undefined,
        style_tags: mainTrack.style_tags || undefined,
        status: mainTrack.status,
        user_id: mainTrack.user_id,
        metadata: mainTrack.metadata as TrackMetadata | null,
        suno_id: mainTrack.suno_id || undefined,
        created_at: mainTrack.created_at,
      });
    }

    const normalizedVersions = Array.from(versionsByNumber.values());

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

    // ✅ Sentry breadcrumb/enhanced logging
    logInfo('Track versions loaded and normalized', context, {
      trackId,
      dbVersionsCount: dbVersions?.length || 0,
      metadataVersionsCount: (mainTrack.metadata as any)?.suno_data?.length || 0,
      finalVersionCount: normalizedVersions.length,
      versionDurations: normalizedVersions.map(v => ({ v: v.versionNumber, d: v.duration })),
    });

    return normalizedVersions;
  } catch (error) {
    // ✅ Sentry breadcrumb/enhanced logging
    logError('Failed to get track with versions', error as Error, context, { trackId });
    return [];
  }
}

export function getPreferredVariant(variants: TrackVariant[]): TrackVariant | null {
  if (!variants || variants.length === 0) return null;
  return variants.find(v => v.isPreferredVariant) || null;
}

export function hasVariants(variants: TrackVariant[]): boolean {
  return variants && variants.length > 0;
}

export function convertLegacyVersionsToVariants(
  legacyVersions: TrackWithVersions[]
): { mainTrack: TrackWithVersions | null; variants: TrackWithVersions[] } {
  if (!legacyVersions || legacyVersions.length === 0) {
    return { mainTrack: null, variants: [] };
  }

  const mainTrack = legacyVersions.find(v => v.sourceVersionNumber === 0) || legacyVersions[0];
  const variants = legacyVersions.filter(v => v.sourceVersionNumber !== null && v.sourceVersionNumber >= 1);

  return { mainTrack, variants };
}

export function getMasterVersion(tracks: TrackWithVersions[]): TrackWithVersions | null {
  if (!tracks || tracks.length === 0) return null;
  const master = tracks.find(t => t.isMasterVersion);
  if (master) return master;
  return tracks[0];
}

export function hasMultipleVersions(tracks: TrackWithVersions[]): boolean {
  if (!tracks) return false;
  return tracks.length > 1;
}

export const trackVersionsQueryKeys = {
  all: ['track-variants'] as const,
  lists: () => [...trackVersionsQueryKeys.all, 'list'] as const,
  list: (trackId: string) => [...trackVersionsQueryKeys.lists(), trackId] as const,
};
