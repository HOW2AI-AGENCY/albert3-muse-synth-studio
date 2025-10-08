import { supabase } from '@/integrations/supabase/client';
import { logError, logInfo } from '@/utils/logger';

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
  metadata?: any; // Add metadata to the interface
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
      .select('*, metadata')
      .eq('id', trackId)
      .single();

    if (trackError) throw trackError;
    if (!mainTrack) return [];

    // Load all versions of this track from the dedicated versions table
    const { data: versions, error: versionsError } = await supabase
      .from('track_versions')
      .select('*')
      .eq('parent_track_id', trackId)
      .order('version_number', { ascending: true });

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
      cover_url: mainTrack.cover_url,
      video_url: mainTrack.video_url,
      duration: mainTrack.duration,
      lyrics: mainTrack.lyrics,
      style_tags: mainTrack.style_tags,
      status: mainTrack.status,
      user_id: mainTrack.user_id,
    });

    // Add all versions from the dedicated table
    if (versions && versions.length > 0) {
      versions.forEach(version => {
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
    } else if (mainTrack.metadata && typeof mainTrack.metadata === 'object' && !Array.isArray(mainTrack.metadata)) {
      // FALLBACK: Если нет записей в track_versions, но есть suno_data в metadata
      const metadata = mainTrack.metadata as Record<string, any>;
      if (metadata.suno_data && Array.isArray(metadata.suno_data)) {
        const sunoVersions = metadata.suno_data.filter((v: any) => 
          v.audioUrl || v.audio_url
        );
        
        if (sunoVersions.length > 1) {
          // Пропускаем первый элемент (это основной трек), добавляем остальные как виртуальные версии
          sunoVersions.slice(1).forEach((version: any, idx: number) => {
            result.push({
              id: `${mainTrack.id}_virtual_v${idx + 1}`, // Виртуальный ID
              parentTrackId: mainTrack.id,
              versionNumber: idx + 1,
              isMasterVersion: false,
              title: `${mainTrack.title} (V${idx + 1})`,
              audio_url: version.audioUrl || version.audio_url || '',
              cover_url: version.image_url || version.imageUrl || mainTrack.cover_url,
              video_url: version.video_url || version.videoUrl,
              duration: version.duration || version.duration_seconds,
              lyrics: version.lyric || version.lyrics,
              style_tags: mainTrack.style_tags,
              user_id: mainTrack.user_id,
            });
          });
        }
      }
    }
    // Fallback for older tracks that store versions in metadata
    else if (mainTrack.metadata?.suno_data && Array.isArray(mainTrack.metadata.suno_data) && mainTrack.metadata.suno_data.length > 1) {
      logInfo('Using fallback to extract versions from metadata', 'trackVersions', { trackId });
      // The first item in suno_data is the main track, so we slice from the second item
      mainTrack.metadata.suno_data.slice(1).forEach((versionData: any, index: number) => {
        result.push({
          id: versionData.id, // Use the ID from the metadata version
          parentTrackId: mainTrack.id,
          versionNumber: index + 1, // Version numbers start from 1
          isMasterVersion: false, // Cannot determine master status from metadata
          title: `${mainTrack.title} (V${index + 1})`,
          audio_url: versionData.audio_url || versionData.stream_audio_url || '',
          cover_url: versionData.image_url || mainTrack.cover_url,
          video_url: versionData.video_url,
          duration: versionData.duration,
          lyrics: mainTrack.lyrics, // Lyrics are likely for the main track
          style_tags: mainTrack.style_tags,
          user_id: mainTrack.user_id,
          status: 'completed' // Assume completed if it's in metadata
        });
      });
    }
    // Fallback for older tracks that store versions in metadata
    else if (mainTrack.metadata?.suno_data && Array.isArray(mainTrack.metadata.suno_data) && mainTrack.metadata.suno_data.length > 1) {
      logInfo('Using fallback to extract versions from metadata', 'trackVersions', { trackId });
      // The first item in suno_data is the main track, so we slice from the second item
      mainTrack.metadata.suno_data.slice(1).forEach((versionData: any, index: number) => {
        result.push({
          id: versionData.id, // Use the ID from the metadata version
          parentTrackId: mainTrack.id,
          versionNumber: index + 1, // Version numbers start from 1
          isMasterVersion: false, // Cannot determine master status from metadata
          title: `${mainTrack.title} (V${index + 1})`,
          audio_url: versionData.audio_url || versionData.stream_audio_url || '',
          cover_url: versionData.image_url || mainTrack.cover_url,
          video_url: versionData.video_url,
          duration: versionData.duration,
          lyrics: mainTrack.lyrics, // Lyrics are likely for the main track
          style_tags: mainTrack.style_tags,
          user_id: mainTrack.user_id,
          status: 'completed' // Assume completed if it's in metadata
        });
      });
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
