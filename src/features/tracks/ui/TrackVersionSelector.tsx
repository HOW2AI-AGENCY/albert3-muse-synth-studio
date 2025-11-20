import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, Star, Play, Pause, ArrowLeftRight } from "@/utils/iconImports";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCurrentTrack, useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { cn } from "@/lib/utils";
import { logger } from "@/utils/logger";

export interface TrackVersionSelectorOption {
  id: string;
  variant_index: number;
  created_at?: string | null;
  is_preferred_variant?: boolean;
  is_primary_variant?: boolean;
  is_original?: boolean;
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
    logger.error("Failed to format version date", error instanceof Error ? error : new Error(String(error)), "TrackVersionSelector", { value });
    return "Дата неизвестна";
  }
};

export const TrackVersionSelector = ({ versions, selectedVersionId, onSelect }: TrackVersionSelectorProps) => {
  const currentTrack = useCurrentTrack();
  const isPlaying = useAudioPlayerStore((state) => state.isPlaying);
  const switchToVersion = useAudioPlayerStore((state) => state.switchToVersion);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const currentTrackId = currentTrack?.id;

  const versionList = useMemo(() => versions ?? [], [versions]);
  const defaultPrimaryId = selectedVersionId ?? versionList[0]?.id;

  const [primarySelection, setPrimarySelection] = useState<string | undefined>(() => defaultPrimaryId);
  const [secondarySelection, setSecondarySelection] = useState<string | undefined>(() =>
    versionList.find((version) => version.id !== defaultPrimaryId)?.id,
  );
  const [activeSlot, setActiveSlot] = useState<"primary" | "secondary">("primary");

  const primaryVersion = useMemo(
    () => versionList.find((version) => version.id === primarySelection),
    [primarySelection, versionList],
  );
  const secondaryVersion = useMemo(
    () => versionList.find((version) => version.id === secondarySelection),
    [secondarySelection, versionList],
  );

  const activeVersionId = activeSlot === "primary" ? primarySelection : secondarySelection;

  useEffect(() => {
    if (selectedVersionId && selectedVersionId !== primarySelection) {
      setPrimarySelection(selectedVersionId);
      setActiveSlot("primary");
    }
  }, [selectedVersionId, primarySelection]);

  useEffect(() => {
    if (primarySelection && !versionList.some((version) => version.id === primarySelection)) {
      const fallbackPrimary = versionList[0]?.id;
      if (fallbackPrimary !== primarySelection) {
        setPrimarySelection(fallbackPrimary);
      }
    }
  }, [primarySelection, versionList]);

  useEffect(() => {
    if (!secondarySelection || secondarySelection === primarySelection) {
      const fallbackSecondary = versionList.find((version) => version.id !== primarySelection)?.id;
      if (fallbackSecondary !== secondarySelection) {
        setSecondarySelection(fallbackSecondary);
      }
    }
  }, [primarySelection, secondarySelection, versionList]);

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
    (version?: TrackVersionSelectorOption) => {
      if (!version) {
        return "Версия не выбрана";
      }

      if (version.is_original) {
        return "Оригинал";
      }

      return `Вариант ${version.variant_index}`;
    },
    [],
  );

  if (!versionList.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <CalendarClock className="h-4 w-4 text-muted-foreground" />
        <span>Выбрать версию</span>
        {versionList.some((version) => version.is_preferred_variant) && (
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
          {versionList.map((version) => (
            <SelectItem
              key={version.id}
              value={version.id}
              className="flex items-center justify-between gap-2"
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {version.is_original ? "Оригинал" : `Вариант ${version.variant_index}`}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(version.created_at)}</span>
              </div>
              {version.is_preferred_variant && (
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
              size="icon"
              className="h-8 w-8"
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
        {versionList.map((version) => {
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
                size="icon"
                className="h-8 w-8"
                aria-label={
                  isCurrent
                    ? isPlayingCurrent
                      ? version.is_original
                        ? "Пауза оригинала"
                        : `Пауза варианта ${version.variant_index}`
                      : version.is_original
                        ? "Продолжить оригинал"
                        : `Продолжить вариант ${version.variant_index}`
                    : version.is_original
                      ? "Воспроизвести оригинал"
                      : `Воспроизвести вариант ${version.variant_index}`
                }
                aria-pressed={isPlayingCurrent}
                onClick={() => handlePlayPause(version.id)}
              >
                {isPlayingCurrent ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">
                  {version.is_original ? "Оригинал" : `Вариант ${version.variant_index}`}
                </span>
                <span className="text-xs text-muted-foreground">{formatDate(version.created_at)}</span>
              </div>
              <div className="flex items-center gap-2">
                {version.is_preferred_variant && (
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
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Назначить вариант ${version.variant_index} как A`}
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
                  size="icon"
                  className="h-8 w-8"
                  aria-label={`Назначить вариант ${version.variant_index} как B`}
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
