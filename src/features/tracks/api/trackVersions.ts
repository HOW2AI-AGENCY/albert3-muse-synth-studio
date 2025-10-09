import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo } from '@/utils/logger';
import type { Database } from '@/integrations/supabase/types';

type TrackRow = Database['public']['Tables']['tracks']['Row'];
type TrackVersionRow = Database['public']['Tables']['track_versions']['Row'];

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
  parentTrackId?: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
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
      .order('version_number', { ascending: true })
      .returns<TrackVersionRow[]>();

    if (versionsError) throw versionsError;

    // Build result array
    const result: TrackWithVersions[] = [];

    // Add main track (original)
    result.push({
      id: mainTrack.id,
      parentTrackId: mainTrack.id,
      versionNumber: 0, // Main track is version 0
      isMasterVersion: !versions?.some(v => v.is_master), // Master if no versions marked as master
      title: mainTrack.title,
      audio_url: mainTrack.audio_url ?? undefined,
      cover_url: mainTrack.cover_url ?? undefined,
      video_url: mainTrack.video_url ?? undefined,
      duration: mainTrack.duration ?? undefined,
      lyrics: mainTrack.lyrics ?? undefined,
      style_tags: mainTrack.style_tags ?? undefined,
      status: mainTrack.status,
      user_id: mainTrack.user_id,
    });

    if (versions && versions.length > 0) {
      versions.forEach((version: TrackVersionRow) => {
        result.push({
          id: version.id,
          parentTrackId: mainTrack.id,
          versionNumber: version.version_number,
          isMasterVersion: version.is_master || false,
          title: `${mainTrack.title} (V${version.version_number})`,
          audio_url: version.audio_url ?? undefined,
          cover_url: version.cover_url ?? mainTrack.cover_url ?? undefined,
          video_url: version.video_url ?? undefined,
          duration: version.duration ?? undefined,
          lyrics: version.lyrics ?? undefined,
          style_tags: mainTrack.style_tags ?? undefined,
          user_id: mainTrack.user_id,
        });
      });
    }
    // FALLBACK LOGIC: If no versions are in the dedicated table, try to extract them from metadata.
    // This is for older tracks that stored version data in a JSONB field.
    else if (
      mainTrack.metadata && 
      typeof mainTrack.metadata === 'object' && 
      'suno_data' in mainTrack.metadata &&
      isSunoDataArray(mainTrack.metadata.suno_data)
    ) {
      const sunoData = mainTrack.metadata.suno_data as SunoTrackData[];
      if (sunoData.length > 1) {
        logInfo('Using fallback to extract versions from metadata', 'trackVersions', { trackId });
        
        // The first item in suno_data is the main track, so we slice from the second item.
        sunoData.slice(1).forEach((versionData: SunoTrackData, index: number) => {
          result.push({
            id: versionData.id,
            parentTrackId: mainTrack.id,
            versionNumber: index + 1,
            isMasterVersion: false,
            title: `${mainTrack.title} (V${index + 1})`,
            audio_url: versionData.audio_url ?? versionData.stream_audio_url ?? undefined,
            cover_url: versionData.image_url ?? mainTrack.cover_url ?? undefined,
            video_url: versionData.video_url ?? undefined,
            duration: versionData.duration ?? undefined,
            lyrics: mainTrack.lyrics ?? undefined,
            style_tags: mainTrack.style_tags ?? undefined,
            user_id: mainTrack.user_id,
            status: 'completed'
          });
        });
      }
    }

    return result;
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
  
  // Find the version marked as master
  const master = tracks.find(t => t.isMasterVersion);
  
  // Return master or first track (main track)
  return master || tracks[0];
}

/**
 * Checks if a track has multiple versions
 */
export function hasMultipleVersions(tracks: TrackWithVersions[]): boolean {
  return tracks.length > 1;
}
