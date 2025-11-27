import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { useTrackLike } from "@/features/tracks";
import { CompactTrackHero } from "@/features/tracks/ui/CompactTrackHero";
import { AnalyticsService } from "@/services/analytics.service";
import { OverviewTab } from "./detail-panel/OverviewTab";
import { VersionsTab } from "./detail-panel/VersionsTab";
import { StemsTab } from "./detail-panel/StemsTab";
import type { Track, TrackVersion, TrackStem } from "./detail-panel/types";
import { logError } from "@/utils/logger";

const DetailsTab = lazy(() => import("./detail-panel/DetailsTab").then(module => ({ default: module.DetailsTab })));

interface DetailPanelContentProps {
  track: Track;
  title: string;
  setTitle: (value: string) => void;
  genre: string;
  setGenre: (value: string) => void;
  mood: string;
  setMood: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  isSaving: boolean;
  versions: TrackVersion[];
  stems: TrackStem[];
  onSave: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  loadVersionsAndStems: () => void;
  tabView?: "overview" | "versions" | "stems" | "details";
}

export const DetailPanelContent = ({
  track,
  title,
  setTitle,
  genre,
  setGenre,
  mood,
  setMood,
  isPublic,
  setIsPublic,
  isSaving,
  versions,
  stems,
  onSave,
  onDownload,
  onShare,
  onDelete,
  loadVersionsAndStems,
  tabView = "overview"
}: DetailPanelContentProps) => {
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const playTrack = useAudioPlayerStore(state => state.playTrack);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();
  const [comparisonLeftId, setComparisonLeftId] = useState<string | undefined>();
  const [comparisonRightId, setComparisonRightId] = useState<string | undefined>();

  useEffect(() => {
    if (!track?.id) return;
    AnalyticsService.recordView(track.id).catch(error => logError('Failed to record track view', error, 'DetailPanel', { trackId: track.id }));
    AnalyticsService.recordPlay(track.id).catch(error => logError('Failed to record track play', error, 'DetailPanel', { trackId: track.id }));
  }, [track?.id]);

  useEffect(() => {
    if (!versions?.length) {
      setSelectedVersionId(undefined);
      setComparisonLeftId(undefined);
      setComparisonRightId(undefined);
      return;
    }
    setSelectedVersionId(current => {
      if (current && versions.some(version => version.id === current)) return current;
      const masterVersion = versions.find(version => version.is_preferred_variant);
      return masterVersion?.id ?? versions[0].id;
    });
  }, [versions]);

  useEffect(() => {
    if (!versions?.length) return;
    setComparisonLeftId(current => {
      if (current && versions.some(version => version.id === current)) return current;
      const masterVersion = versions.find(version => version.is_preferred_variant);
      return masterVersion?.id ?? versions[0].id;
    });
  }, [versions]);

  useEffect(() => {
    if (!versions?.length) {
      setComparisonRightId(undefined);
      return;
    }
    setComparisonRightId(current => {
      if (current && current !== comparisonLeftId && versions.some(version => version.id === current)) return current;
      const alternative = versions.find(version => version.id !== comparisonLeftId);
      if (alternative) return alternative.id;
      return versions.length > 1 ? versions[1].id : undefined;
    });
  }, [versions, comparisonLeftId]);

  const activeVersion = useMemo(() => versions.find(version => version.id === selectedVersionId), [versions, selectedVersionId]);
  const filteredStems = useMemo(() => {
    if (!selectedVersionId) return stems.filter(stem => !stem.version_id);
    return stems.filter(stem => !stem.version_id || stem.version_id === selectedVersionId);
  }, [stems, selectedVersionId]);

  const handleVersionSelect = useCallback((versionId: string) => {
    setSelectedVersionId(versionId);
    setComparisonLeftId(versionId);
    setComparisonRightId(current => {
      if (current && current !== versionId && versions.some(version => version.id === current)) return current;
      const alternative = versions.find(version => version.id !== versionId);
      return alternative?.id ?? current;
    });
  }, [versions]);

  const handleComparisonLeftChange = useCallback((versionId: string) => {
    setComparisonLeftId(versionId);
    setSelectedVersionId(versionId);
    setComparisonRightId(current => {
      if (current && current !== versionId && versions.some(version => version.id === current)) return current;
      const alternative = versions.find(version => version.id !== versionId);
      return alternative?.id ?? current;
    });
  }, [versions]);

  const handleComparisonRightChange = useCallback((versionId: string) => {
    if (versionId === comparisonLeftId) {
      const alternative = versions.find(version => version.id !== versionId);
      if (alternative) {
        setComparisonLeftId(alternative.id);
        setSelectedVersionId(alternative.id);
      }
    }
    setComparisonRightId(versionId);
  }, [comparisonLeftId, versions]);

  const handleComparisonSwap = useCallback((leftId: string, rightId: string) => {
    setComparisonLeftId(rightId);
    setSelectedVersionId(rightId);
    setComparisonRightId(leftId);
  }, []);
  
  const extractArtist = (metadata?: Record<string, unknown> | null) => {
    if (!metadata) return undefined;
    const artistKeys = ["artist", "artist_name", "artistName", "creator", "performer"] as const;
    for (const key of artistKeys) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim().length > 0) return value;
    }
    return undefined;
  };
  const artist = extractArtist(track.metadata) ?? "Неизвестный артист";

  return (
    <div className="space-y-4">
      <CompactTrackHero 
        track={track} 
        activeVersion={activeVersion ? { 
          variant_index: activeVersion.variant_index ?? 0, 
          created_at: activeVersion.created_at ?? undefined, 
          duration: activeVersion.duration ?? undefined 
        } : null}
        artist={artist} 
        isLiked={isLiked} 
        likeCount={likeCount} 
        onLike={toggleLike} 
        onDownload={onDownload} 
        onShare={onShare} 
        onOpenPlayer={() => playTrack({
          id: track.id,
          title: track.title,
          audio_url: track.audio_url || '',
          cover_url: track.cover_url ?? undefined,
          duration: track.duration ?? track.duration_seconds ?? undefined,
          status: track.status as any || "completed",
          style_tags: track.style_tags ?? [],
          lyrics: track.lyrics ?? undefined
        })}
      />

      <div className="space-y-4">
        {tabView === "overview" && (
          <OverviewTab
            track={track}
            title={title}
            setTitle={setTitle}
            genre={genre}
            setGenre={setGenre}
            mood={mood}
            setMood={setMood}
          isPublic={isPublic}
          setIsPublic={(value) => setIsPublic(value)}
            isSaving={isSaving}
            onSave={onSave}
            createdAtToDisplay={activeVersion?.created_at ?? track.created_at}
            durationToDisplay={activeVersion?.duration ?? track.duration_seconds ?? undefined}
          />
        )}
        {tabView === "versions" && (
          <VersionsTab
            track={track}
            versions={versions}
            selectedVersionId={selectedVersionId}
            comparisonLeftId={comparisonLeftId}
            comparisonRightId={comparisonRightId}
            handleVersionSelect={handleVersionSelect}
            handleComparisonLeftChange={handleComparisonLeftChange}
            handleComparisonRightChange={handleComparisonRightChange}
            handleComparisonSwap={handleComparisonSwap}
            loadVersionsAndStems={loadVersionsAndStems}
          />
        )}
        {tabView === "stems" && (
          <StemsTab
            track={track}
            selectedVersionId={selectedVersionId}
            filteredStems={filteredStems}
            loadVersionsAndStems={loadVersionsAndStems}
          />
        )}
        {tabView === "details" && (
          <Suspense fallback={<div>Loading...</div>}>
            <DetailsTab track={track} onDelete={onDelete} />
          </Suspense>
        )}
      </div>
    </div>
  );
};
