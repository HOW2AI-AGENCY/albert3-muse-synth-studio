import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Star, Play, Pause, ArrowLeftRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { cn } from "@/lib/utils";

export interface TrackVersionSelectorOption {
  id: string;
  version_number: number;
  created_at?: string | null;
  is_master?: boolean;
}

interface TrackVersionSelectorProps {
  versions: TrackVersionSelectorOption[];
  selectedVersionId?: string;
  onSelect?: (versionId: string) => void;
}

const formatDate = (value?: string | null) => {
  if (!value) return "Дата неизвестна";
  try {
    return new Date(value).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    console.error("Failed to format version date", error);
    return "Дата неизвестна";
  }
};

export const TrackVersionSelector = ({ versions, selectedVersionId, onSelect }: TrackVersionSelectorProps) => {
  if (!versions?.length) {
    return null;
  }

  const { currentTrack, isPlaying, switchToVersion, togglePlayPause } = useAudioPlayer();
  const currentTrackId = currentTrack?.id;

  const [primarySelection, setPrimarySelection] = useState<string | undefined>(
    selectedVersionId ?? versions[0]?.id,
  );
  const [secondarySelection, setSecondarySelection] = useState<string | undefined>(() =>
    versions.find((version) => version.id !== (selectedVersionId ?? versions[0]?.id))?.id,
  );
  const [activeSlot, setActiveSlot] = useState<"primary" | "secondary">("primary");

  const primaryVersion = useMemo(
    () => versions.find((version) => version.id === primarySelection),
    [primarySelection, versions],
  );
  const secondaryVersion = useMemo(
    () => versions.find((version) => version.id === secondarySelection),
    [secondarySelection, versions],
  );

  const activeVersionId = activeSlot === "primary" ? primarySelection : secondarySelection;

  useEffect(() => {
    if (selectedVersionId && selectedVersionId !== primarySelection) {
      setPrimarySelection(selectedVersionId);
      setActiveSlot("primary");
    }
  }, [selectedVersionId, primarySelection]);

  useEffect(() => {
    if (primarySelection && !versions.some((version) => version.id === primarySelection)) {
      const fallbackPrimary = versions[0]?.id;
      if (fallbackPrimary !== primarySelection) {
        setPrimarySelection(fallbackPrimary);
      }
    }
  }, [primarySelection, versions]);

  useEffect(() => {
    if (!secondarySelection || secondarySelection === primarySelection) {
      const fallbackSecondary = versions.find((version) => version.id !== primarySelection)?.id;
      if (fallbackSecondary !== secondarySelection) {
        setSecondarySelection(fallbackSecondary);
      }
    }
  }, [primarySelection, secondarySelection, versions]);

  const handleSelectVersion = useCallback(
    (versionId: string) => {
      onSelect?.(versionId);
      switchToVersion(versionId);
    },
    [onSelect, switchToVersion],
  );

  const handleManualSelect = useCallback(
    (versionId: string) => {
      if (activeSlot === "primary") {
        setPrimarySelection(versionId);
      } else {
        setSecondarySelection(versionId);
      }
      handleSelectVersion(versionId);
    },
    [activeSlot, handleSelectVersion],
  );

  const handleAssignSlot = useCallback(
    (slot: "primary" | "secondary", versionId: string, { play }: { play?: boolean } = {}) => {
      if (slot === "primary") {
        setPrimarySelection(versionId);
      } else {
        setSecondarySelection(versionId);
      }

      if (play) {
        setActiveSlot(slot);
        handleSelectVersion(versionId);
      }
    },
    [handleSelectVersion],
  );

  const handleActivateSlot = useCallback(
    (slot: "primary" | "secondary") => {
      const versionId = slot === "primary" ? primarySelection : secondarySelection;
      if (!versionId) return;

      setActiveSlot(slot);
      handleSelectVersion(versionId);
    },
    [handleSelectVersion, primarySelection, secondarySelection],
  );

  const handleFlipActive = useCallback(() => {
    const nextSlot = activeSlot === "primary" ? "secondary" : "primary";
    const versionId = nextSlot === "primary" ? primarySelection : secondarySelection;
    if (!versionId) return;

    setActiveSlot(nextSlot);
    handleSelectVersion(versionId);
  }, [activeSlot, handleSelectVersion, primarySelection, secondarySelection]);

  const handlePlayPause = useCallback(
    (versionId: string) => {
      const isCurrent = currentTrackId === versionId;
      if (isCurrent) {
        togglePlayPause();
        return;
      }

      if (primarySelection === versionId) {
        setActiveSlot("primary");
      } else if (secondarySelection === versionId) {
        setActiveSlot("secondary");
      } else {
        setPrimarySelection(versionId);
        setActiveSlot("primary");
      }

      handleSelectVersion(versionId);
    },
    [currentTrackId, handleSelectVersion, primarySelection, secondarySelection, togglePlayPause],
  );

  const getVersionLabel = useCallback(
    (version?: TrackVersionSelectorOption) =>
      version ? `Версия ${version.version_number}` : "Версия не выбрана",
    [],
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <span>Выбрать версию</span>
        {versions.some((version) => version.is_master) && (
          <Badge variant="outline" className="gap-1 text-xs">
            <Star className="h-3 w-3" />
            Главная
          </Badge>
        )}
      </div>
      <Select value={activeVersionId ?? undefined} onValueChange={handleManualSelect}>
        <SelectTrigger className="h-11 justify-between text-left" aria-label="Выбор версии трека">
          <SelectValue placeholder="Выберите версию трека" />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {versions.map((version) => (
            <SelectItem
              key={version.id}
              value={version.id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex flex-col">
                <span className="font-medium">Версия {version.version_number}</span>
                <span className="text-xs text-muted-foreground">{formatDate(version.created_at)}</span>
              </div>
              {version.is_master && (
                <Badge variant="secondary" className="gap-1 text-[11px]">
                  <Star className="h-3 w-3" />
                  Главная
                </Badge>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div
        className="rounded-lg border border-border/60 bg-background/60 p-3 shadow-sm"
        aria-label="Режим сравнения версий"
      >
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div className="text-sm font-medium">Сравнение A/B</div>
          <div className="flex items-center gap-2" role="group" aria-label="Управление сравнениями A/B">
            <Button
              type="button"
              variant={activeSlot === "primary" ? "default" : "outline"}
              size="sm"
              onClick={() => handleActivateSlot("primary")}
              aria-pressed={activeSlot === "primary"}
              aria-label="Слушать версию A"
              disabled={!primarySelection}
            >
              Слушать A
            </Button>
            <Button
              type="button"
              variant={activeSlot === "secondary" ? "default" : "outline"}
              size="sm"
              onClick={() => handleActivateSlot("secondary")}
              aria-pressed={activeSlot === "secondary"}
              aria-label="Слушать версию B"
              disabled={!secondarySelection}
            >
              Слушать B
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={handleFlipActive}
              aria-label="Переключить активную версию между A и B"
              disabled={!primarySelection || !secondarySelection}
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
          <div>
            <span className="font-medium text-foreground">A:</span> {getVersionLabel(primaryVersion)}
          </div>
          <div>
            <span className="font-medium text-foreground">B:</span> {getVersionLabel(secondaryVersion)}
          </div>
        </div>
      </div>
      <div className="space-y-2" role="list" aria-label="Список версий трека">
        {versions.map((version) => {
          const isCurrent = currentTrackId === version.id;
          const isPlayingCurrent = isCurrent && isPlaying;
          const isAssignedToPrimary = primarySelection === version.id;
          const isAssignedToSecondary = secondarySelection === version.id;
          const isActiveVersion =
            (activeSlot === "primary" && isAssignedToPrimary) ||
            (activeSlot === "secondary" && isAssignedToSecondary);

          return (
            <div
              key={version.id}
              role="listitem"
              className={cn(
                "flex items-center gap-3 rounded-lg border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary/70",
                isActiveVersion ? "border-primary/70 bg-primary/5" : "border-border/60 bg-background/40",
              )}
            >
              <Button
                type="button"
                variant={isPlayingCurrent ? "default" : "outline"}
                size="icon-sm"
                aria-label={
                  isCurrent
                    ? isPlayingCurrent
                      ? `Пауза версии ${version.version_number}`
                      : `Продолжить версию ${version.version_number}`
                    : `Воспроизвести версию ${version.version_number}`
                }
                aria-pressed={isPlayingCurrent}
                onClick={() => handlePlayPause(version.id)}
              >
                {isPlayingCurrent ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">Версия {version.version_number}</span>
                <span className="text-xs text-muted-foreground">{formatDate(version.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                {version.is_master && (
                  <Badge variant="secondary" className="gap-1 text-[11px]">
                    <Star className="h-3 w-3" />
                    Главная
                  </Badge>
                )}
                {isActiveVersion && (
                  <Badge variant="outline" className="text-[11px]">
                    Активна
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant={isAssignedToPrimary ? "default" : "outline"}
                  size="icon-sm"
                  aria-label={`Назначить версию ${version.version_number} как A`}
                  aria-pressed={isAssignedToPrimary}
                  onClick={() =>
                    handleAssignSlot("primary", version.id, {
                      play: activeSlot === "primary",
                    })
                  }
                >
                  A
                </Button>
                <Button
                  type="button"
                  variant={isAssignedToSecondary ? "default" : "outline"}
                  size="icon-sm"
                  aria-label={`Назначить версию ${version.version_number} как B`}
                  aria-pressed={isAssignedToSecondary}
                  onClick={() =>
                    handleAssignSlot("secondary", version.id, {
                      play: activeSlot === "secondary",
                    })
                  }
                >
                  B
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
