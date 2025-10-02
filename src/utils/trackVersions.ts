import { supabase } from "@/integrations/supabase/client";

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
}

/**
 * Loads a track and all its versions from the database
 * Returns an array where first element is the main track, followed by all versions
 */
export async function getTrackWithVersions(trackId: string): Promise<TrackWithVersions[]> {
  try {
    // Load the main track
    const { data: mainTrack, error: trackError } = await supabase
      .from('tracks')
      .select('*')
      .eq('id', trackId)
      .single();

    if (trackError) throw trackError;
    if (!mainTrack) return [];

    // Load all versions of this track
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

    // Add all versions
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
    }

    return result;
  } catch (error) {
    console.error('Error loading track with versions:', error);
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
