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
function isSunoDataArray(data: any): data is SunoTrackData[] {
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
  audio_url: string;
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

const isTrackMetadata = (metadata: unknown): metadata is TrackMetadata =>
  typeof metadata === 'object' && metadata !== null;

const isSunoMetadataEntry = (entry: unknown): entry is SunoMetadataEntry =>
  typeof entry === 'object' && entry !== null;

const hasAudioSource = (entry: SunoMetadataEntry | undefined): entry is SunoMetadataEntry =>
  Boolean(entry && (entry.audioUrl || entry.audio_url || entry.stream_audio_url));

const resolveAudioUrl = (entry: SunoMetadataEntry): string =>
  entry.audioUrl || entry.audio_url || entry.stream_audio_url || '';

const resolveImageUrl = (entry: SunoMetadataEntry, fallback?: string | null): string | undefined =>
  entry.image_url || entry.imageUrl || fallback || undefined;

const resolveVideoUrl = (entry: SunoMetadataEntry): string | undefined =>
  entry.video_url || entry.videoUrl || undefined;

const resolveDuration = (entry: SunoMetadataEntry): number | undefined =>
  entry.duration ?? entry.duration_seconds ?? undefined;

const resolveLyrics = (entry: SunoMetadataEntry, fallback?: string | null): string | undefined =>
  entry.lyric || entry.lyrics || fallback || undefined;

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
      audio_url: mainTrack.audio_url || '',
      cover_url: mainTrack.cover_url ?? undefined,
      video_url: mainTrack.video_url ?? undefined,
      duration: mainTrack.duration ?? undefined,
      lyrics: mainTrack.lyrics ?? undefined,
      style_tags: mainTrack.style_tags ?? undefined,
      status: mainTrack.status,
      user_id: mainTrack.user_id,
    });

    const metadata = isTrackMetadata(mainTrack.metadata) ? mainTrack.metadata : null;

    if (versions && versions.length > 0) {
      versions.forEach((version: TrackVersionRow) => {
        result.push({
          id: version.id,
          parentTrackId: mainTrack.id,
          versionNumber: version.version_number,
          isMasterVersion: version.is_master || false,
          title: `${mainTrack.title} (V${version.version_number})`,
          audio_url: version.audio_url || '',
          cover_url: version.cover_url || mainTrack.cover_url,
          video_url: version.video_url,
          duration: version.duration,
          lyrics: version.lyrics,
          style_tags: mainTrack.style_tags,
          user_id: mainTrack.user_id,
        });
      });
    }
    // FALLBACK LOGIC: If no versions are in the dedicated table, try to extract them from metadata.
    // This is for older tracks that stored version data in a JSONB field.
    else if (mainTrack.metadata && 'suno_data' in mainTrack.metadata && isSunoDataArray(mainTrack.metadata.suno_data)) {
      if (mainTrack.metadata.suno_data.length > 1) {
        logInfo('Using fallback to extract versions from metadata', 'trackVersions', { trackId });
        
        // The first item in suno_data is the main track, so we slice from the second item.
        mainTrack.metadata.suno_data.slice(1).forEach((versionData: SunoTrackData, index: number) => {
          result.push({
            id: versionData.id, // Use the ID from the metadata version
            parentTrackId: mainTrack.id,
            versionNumber: index + 1, // Version numbers start from 1
            isMasterVersion: false, // This info is not available in the old metadata format
            title: `${mainTrack.title} (V${index + 1})`,
            audio_url: versionData.audio_url || versionData.stream_audio_url || '',
            cover_url: versionData.image_url || mainTrack.cover_url,
            video_url: versionData.video_url,
            duration: versionData.duration,
            lyrics: mainTrack.lyrics, // Lyrics are likely for the main track only
            style_tags: mainTrack.style_tags,
            user_id: mainTrack.user_id,
            status: 'completed' // Assume 'completed' if it's in metadata
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
