import type { TrackVersionMetadata } from "./TrackVersionMetadataPanel";
import type { AudioPlayerTrack } from "@/types/track";

export interface TrackVersionLike {
  id: string;
  version_number: number;
  is_master: boolean;
  is_original?: boolean;
  source_version_number?: number | null;
  audio_url: string;
  cover_url?: string;
  duration?: number;
  lyrics?: string;
  metadata?: TrackVersionMetadata | null;
}

export const formatTrackVersionDuration = (seconds?: number) => {
  if (!seconds) return "--:--";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const getVersionMetadata = (
  versionMetadata?: TrackVersionMetadata | null,
  fallbackMetadata?: TrackVersionMetadata | null
) => {
  return versionMetadata ?? fallbackMetadata ?? null;
};

export const buildAudioPlayerTrack = (
  version: TrackVersionLike,
  trackId: string
): AudioPlayerTrack => ({
  id: version.id,
  title: version.is_original ? 'Оригинал' : `Версия ${version.version_number}`,
  audio_url: version.audio_url,
  cover_url: version.cover_url,
  duration: version.duration,
  status: "completed",
  style_tags: [],
  lyrics: version.lyrics,
  parentTrackId: trackId,
  versionNumber: version.version_number,
  isMasterVersion: version.is_master,
  isOriginalVersion: Boolean(version.is_original),
  sourceVersionNumber: version.source_version_number ?? null,
});
