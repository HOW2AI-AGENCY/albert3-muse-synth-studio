import type { TrackVersionMetadata } from "./TrackVersionMetadataPanel";
import type { AudioPlayerTrack } from "@/types/track";

export interface TrackVersionLike {
  id: string;
  variant_index: number;
  is_preferred_variant: boolean;
  is_primary_variant?: boolean;
  source_variant_index?: number | null;
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
  title: `V${version.variant_index + 1}`,
  audio_url: version.audio_url || '',
  cover_url: version.cover_url,
  duration: version.duration,
  status: "completed",
  style_tags: [],
  lyrics: version.lyrics,
  parentTrackId: trackId,
  versionNumber: version.variant_index + 1,
  isMasterVersion: version.is_preferred_variant,
  sourceVersionNumber: version.source_variant_index ?? null,
});
