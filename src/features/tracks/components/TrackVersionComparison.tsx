import { memo, useMemo, useCallback } from "react";
import { Play, Pause, ArrowLeftRight, Star, Clock } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { TrackVersionMetadataPanel, type TrackVersionMetadata } from "./TrackVersionMetadataPanel";
import {
  buildAudioPlayerTrack,
  formatTrackVersionDuration,
  getVersionMetadata,
  type TrackVersionLike,
} from "./trackVersionUtils";

interface ComparisonTrackVersion extends TrackVersionLike {
  suno_id?: string;
  video_url?: string;
  created_at?: string;
}

interface TrackVersionComparisonProps {
  trackId: string;
  versions: ComparisonTrackVersion[];
  trackMetadata?: TrackVersionMetadata | null;
  leftVersionId?: string;
  rightVersionId?: string;
  onLeftVersionChange?: (versionId: string) => void;
  onRightVersionChange?: (versionId: string) => void;
  onSwapSides?: (leftVersionId: string, rightVersionId: string) => void;
}

const generateWaveformHeights = (seed: string, bars = 28) => {
  if (!seed) {
    return Array.from({ length: bars }, (_, index) => 40 + (index % 5) * 6);
  }

  const normalizedSeed = seed
    .split("")
    .reduce((acc, char, index) => acc + char.charCodeAt(0) * (index + 1), 0);

  return Array.from({ length: bars }, (_, index) => {
    const value = Math.abs(Math.sin(normalizedSeed * (index + 1) * 0.37));
    return 25 + Math.floor(value * 60);
  });
};

interface WaveformPreviewProps {
  seed: string;
  isActive?: boolean;
}

const WaveformPreview = ({ seed, isActive }: WaveformPreviewProps) => {
  const heights = useMemo(() => generateWaveformHeights(seed), [seed]);

  return (
    <div
      className={cn(
        "flex h-16 items-end gap-[3px] overflow-hidden rounded-md border p-2",
        isActive
          ? "border-primary/40 bg-primary/10"
          : "border-border/60 bg-muted/40 dark:bg-muted/20"
      )}
    >
      {heights.map((height, index) => (
        <span
          key={`${seed}-${index}`}
          className={cn(
            "flex-1 rounded-full transition-all duration-500",
            isActive ? "bg-primary/80" : "bg-primary/40"
          )}
          style={{ height: `${height}%`, minWidth: "2px" }}
        />
      ))}
    </div>
  );
};

const emptyState = (
  <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border/60 p-6 text-sm text-muted-foreground">
    Недостаточно версий для сравнения
  </div>
);

const TrackVersionComparisonComponent = ({
  trackId,
  versions,
  trackMetadata,
  leftVersionId,
  rightVersionId,
  onLeftVersionChange,
  onRightVersionChange,
  onSwapSides,
}: TrackVersionComparisonProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const { vibrate } = useHapticFeedback();

  const hasEnoughVersions = versions?.length >= 2;
  const versionOptions = useMemo(() => versions ?? [], [versions]);

  const leftVersion = useMemo(() => {
    if (!versionOptions.length) {
      return undefined;
    }

    if (leftVersionId) {
      const match = versionOptions.find(version => version.id === leftVersionId);
      if (match) {
        return match;
      }
    }

    return versionOptions[0];
  }, [versionOptions, leftVersionId]);

  const rightVersion = useMemo(() => {
    if (!versionOptions.length) {
      return undefined;
    }

    if (rightVersionId) {
      const match = versionOptions.find(version => version.id === rightVersionId);
      if (match) {
        return match;
      }
    }

    return versionOptions.find(version => version.id !== leftVersion?.id) ?? versionOptions[1];
  }, [versionOptions, rightVersionId, leftVersion?.id]);

  const handlePlay = useCallback(
    (version: ComparisonTrackVersion) => {
      vibrate('light');

      const isCurrentVersion = currentTrack?.id === version.id;

      if (isCurrentVersion && isPlaying) {
        togglePlayPause();
        return;
      }

      playTrack(buildAudioPlayerTrack(version, trackId));
    },
    [currentTrack?.id, isPlaying, playTrack, togglePlayPause, trackId, vibrate]
  );

  const handleSwap = useCallback(() => {
    if (!leftVersion || !rightVersion) {
      return;
    }

    vibrate('medium');
    onSwapSides?.(leftVersion.id, rightVersion.id);
  }, [leftVersion, onSwapSides, rightVersion, vibrate]);

  const renderVersionColumn = (
    version: ComparisonTrackVersion | undefined,
    selectedId: string | undefined,
    onSelect: ((versionId: string) => void) | undefined,
    label: string
  ) => {
    if (!version) {
      return emptyState;
    }

    const isCurrentVersion = currentTrack?.id === version.id;
    const isVersionPlaying = isCurrentVersion && isPlaying;

    return (
      <div
        className={cn(
          "flex flex-col gap-4 rounded-lg border border-border/70 bg-background/70 p-4 shadow-sm transition-colors",
          isVersionPlaying && "ring-2 ring-primary/60 bg-primary/5"
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold">
                {version.is_original ? 'Оригинал' : `Вариант ${version.variant_index}`}
              </span>
              {version.is_preferred_variant && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <Star className="h-3 w-3" />
                  Главная
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatTrackVersionDuration(version.duration)}
            </div>
          </div>
          <Button
            size="icon"
            variant={isVersionPlaying ? "default" : "outline"}
            className="h-10 w-10 flex-shrink-0"
            onClick={() => handlePlay(version)}
            aria-label={
              isVersionPlaying
                ? version.is_original
                  ? "Пауза оригинала"
                  : `Пауза варианта ${version.variant_index}`
                : version.is_original
                  ? "Воспроизвести оригинал"
                  : `Воспроизвести вариант ${version.variant_index}`
            }
          >
            {isVersionPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>

        <Select
          value={selectedId ?? version.id}
          onValueChange={value => {
            vibrate('light');
            onSelect?.(value);
          }}
        >
          <SelectTrigger className="h-10 justify-between text-left">
            <SelectValue placeholder="Выберите версию" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {versionOptions.map(option => (
              <SelectItem key={option.id} value={option.id} className="flex items-center gap-2 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium">
                    {option.is_original ? 'Оригинал' : `Вариант ${option.variant_index}`}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatTrackVersionDuration(option.duration)}
                  </span>
                </div>
                {option.is_preferred_variant && (
                  <Badge variant="outline" className="ml-auto gap-1 text-[10px]">
                    <Star className="h-3 w-3" />
                    Главная
                  </Badge>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <WaveformPreview seed={`${version.id}-${version.variant_index}`} isActive={isVersionPlaying} />

        <TrackVersionMetadataPanel
          metadata={getVersionMetadata(version.metadata, trackMetadata)}
          fallbackMetadata={trackMetadata}
          className="rounded-md border border-border/60 bg-background/70 p-3"
        />
      </div>
    );
  };

  if (!hasEnoughVersions) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-start">
        {renderVersionColumn(leftVersion, leftVersionId ?? leftVersion?.id, onLeftVersionChange, "Версия A")}
        <div className="flex items-center justify-center">
          <Button
            variant="outline"
            size="icon"
            onClick={handleSwap}
            disabled={!leftVersion || !rightVersion}
            aria-label="Поменять версии местами"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
        </div>
        {renderVersionColumn(rightVersion, rightVersionId ?? rightVersion?.id, onRightVersionChange, "Версия B")}
      </div>
    </div>
  );
};

export const TrackVersionComparison = memo(TrackVersionComparisonComponent);
