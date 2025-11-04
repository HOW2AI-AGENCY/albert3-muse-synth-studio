import { useState, memo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Star, Music2, ChevronDown, ChevronUp, Trash2 } from "@/utils/iconImports";
import { toast } from "sonner";
import { useCurrentTrack, useIsPlaying, useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { logError, logInfo } from "@/utils/logger";
import { TrackVersionMetadataPanel, type TrackVersionMetadata } from "./TrackVersionMetadataPanel";
import {
  buildAudioPlayerTrack,
  formatTrackVersionDuration,
  getVersionMetadata,
  type TrackVersionLike,
} from "./trackVersionUtils";
import { deleteTrackVersion, setMasterVersion } from "../api/trackVersions";
import { TrackOperationsLogger } from "@/services/track-operations.logger";

interface TrackVersion extends TrackVersionLike {
  suno_id: string;
  video_url?: string;
}

interface TrackVersionsProps {
  trackId: string;
  versions: TrackVersion[];
  trackMetadata?: TrackVersionMetadata | null;
  onVersionUpdate?: () => void;
}

const TrackVersionsComponent = ({ trackId, versions, trackMetadata, onVersionUpdate }: TrackVersionsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<TrackVersion | null>(null);
  const currentTrack = useCurrentTrack();
  const isPlaying = useIsPlaying();
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const togglePlayPause = useAudioPlayerStore((state) => state.togglePlayPause);
  const { vibrate } = useHapticFeedback();

  // Мемоизируем функцию установки мастер-версии
  const handleSetMaster = useCallback(async (versionId: string, versionNumber: number, isPrimary?: boolean) => {
    if (isPrimary) {
      toast.info('Первичную версию нельзя назначить напрямую. Сделайте мастер-версией одну из альтернатив.');
      return;
    }

    try {
      vibrate('medium');

      // Централизованный откат через установку мастер-версии
      await TrackOperationsLogger.trackOperation('rollback', trackId, async () => {
        const result = await setMasterVersion(trackId, versionId);
        if (!result.ok) {
          throw result.error;
        }
      }, { versionNumber });

      vibrate('success');
      toast.success(`Версия ${versionNumber} установлена как главная`);
      onVersionUpdate?.();
    } catch (error) {
      logError("Ошибка при установке мастер-версии", error as Error, "TrackVersions", {
        trackId,
        versionId
      });
      
      vibrate('error');
      toast.error('Ошибка при установке главной версии');
    }
  }, [trackId, versions, vibrate, onVersionUpdate]);

  // Мемоизируем функцию воспроизведения версии
  const handlePlayVersion = useCallback((version: TrackVersion) => {
    vibrate('light');

    logInfo(`Playing version ${version.variant_index}`, 'TrackVersions', {
      versionId: version.id,
      versionNumber: version.variant_index,
      trackId
    });

    // Используем реальный ID версии вместо синтетического
    const isCurrentVersion = currentTrack?.id === version.id;

    if (isCurrentVersion && isPlaying) {
      togglePlayPause();
    } else {
      playTrack(buildAudioPlayerTrack(version, trackId));
    }
  }, [trackId, currentTrack, isPlaying, vibrate, togglePlayPause, playTrack]);

  // Мемоизируем функцию удаления версии
  const handleDeleteVersion = useCallback(async (version: TrackVersion) => {
    if (version.is_primary_variant) {
      toast.error('Невозможно удалить первичную версию трека');
      return;
    }

    // Check if this is the last version
    const nonPrimaryVersions = versions.filter(v => !v.is_primary_variant);
    if (nonPrimaryVersions.length === 1) {
      toast.error('Невозможно удалить единственную версию');
      return;
    }

    setVersionToDelete(version);
    setDeleteDialogOpen(true);
  }, [versions]);

  // Мемоизируем функцию подтверждения удаления
  const confirmDeleteVersion = useCallback(async () => {
    if (!versionToDelete) return;

    try {
      vibrate('warning');
      
      // If deleting master version, reassign to first remaining
      if (versionToDelete.is_preferred_variant && versions.length > 1) {
        const nextVersion = versions.find(v => v.id !== versionToDelete.id && !v.is_primary_variant);
        if (nextVersion) {
          const updateResult = await setMasterVersion(trackId, nextVersion.id);
          if (!updateResult.ok) {
            throw updateResult.error;
          }
        }
      }

      // Delete the version
      const deletionResult = await deleteTrackVersion(versionToDelete.id);
      if (!deletionResult.ok) {
        throw deletionResult.error;
      }

      vibrate('success');
      toast.success(`Вариант ${versionToDelete.variant_index} удалён`);
      onVersionUpdate?.();
    } catch (error) {
      logError("Ошибка при удалении версии", error as Error, "TrackVersions", {
        trackId,
        versionId: versionToDelete.id
      });
      
      vibrate('error');
      toast.error('Ошибка при удалении версии');
    } finally {
      setDeleteDialogOpen(false);
      setVersionToDelete(null);
    }
  }, [versionToDelete, versions, trackId, vibrate, onVersionUpdate]);

  const additionalVersions = versions.filter(version => !version.is_primary_variant);
  const primaryVersion = versions.find(v => v.is_primary_variant);
  const preferredVersion = versions.find(v => v.is_preferred_variant) || primaryVersion;
  const activeVersionLabel = preferredVersion ? `V${(preferredVersion.variant_index ?? 0) + 1}` : 'V1';

  if (!versions || versions.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-muted-foreground" />
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 text-xs font-medium"
            onClick={() => {
              vibrate('light');
              setSelectorOpen((prev) => !prev);
            }}
            aria-expanded={selectorOpen}
            aria-label="Активная версия"
          >
            {activeVersionLabel}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            vibrate('light');
            setIsExpanded(!isExpanded);
          }}
          className="h-8"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {selectorOpen && (
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/40 border border-muted/50 transition-all animate-fade-in">
          {versions.map((v) => (
            <Button
              key={v.id}
              size="sm"
              variant={v.id === preferredVersion?.id ? 'default' : 'ghost'}
              className="h-7 px-2 text-xs"
              onClick={() => handleSetMaster(v.id, (v.variant_index ?? 0) + 1, v.is_primary_variant)}
              aria-label={`Выбрать версию V${v.variant_index || v.version_number || 1}`}
            >
              {`V${(v.variant_index ?? 0) + 1}`}
              {v.is_preferred_variant ? <Star className="w-3 h-3 ml-1" /> : null}
            </Button>
          ))}
        </div>
      )}

      {isExpanded && (
        <div className="space-y-2 animate-fade-in">
          {additionalVersions.map((version) => {
            // Сравниваем с реальным ID версии
            const isCurrentVersion = currentTrack?.id === version.id;
            const isVersionPlaying = isCurrentVersion && isPlaying;

            return (
              <Card
                key={version.id}
                className={`p-3 transition-all hover:bg-muted/50 ${
                  version.is_preferred_variant ? 'ring-2 ring-primary bg-primary/5' : ''
                }`}
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:gap-4">
                  <div className="flex flex-1 flex-col gap-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="flex items-center gap-3">
                        <Button
                          size="icon"
                          variant={isVersionPlaying ? "default" : "outline"}
                          onClick={() => handlePlayVersion(version)}
                          aria-label={
                            isVersionPlaying
                              ? `Пауза варианта ${version.variant_index}`
                              : `Воспроизвести вариант ${version.variant_index}`
                          }
                          className="h-10 w-10 flex-shrink-0 transition-transform active:scale-95"
                        >
                          {isVersionPlaying ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-sm">
                              {`Вариант ${version.variant_index}`}
                            </span>
                            {version.is_preferred_variant && (
                              <Badge variant="default" className="gap-1 text-xs">
                                <Star className="w-3 h-3 fill-current" />
                                Главная
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatTrackVersionDuration(version.duration)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 sm:ml-auto">
                        {!version.is_preferred_variant && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetMaster(version.id, version.variant_index, version.is_primary_variant)}
                            aria-label={`Откатить на вариант ${version.variant_index}`}
                            className="text-xs h-8 transition-transform active:scale-95"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Откатить на эту версию</span>
                            <span className="sm:hidden">Откатить</span>
                          </Button>
                        )}

                        {additionalCount > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteVersion(version)}
                            aria-label={`Удалить вариант ${version.variant_index}`}
                            className="text-xs h-8 text-destructive hover:text-destructive transition-transform active:scale-95"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <TrackVersionMetadataPanel
                    metadata={getVersionMetadata(version.metadata, trackMetadata)}
                    fallbackMetadata={trackMetadata}
                    className="w-full lg:max-w-md"
                  />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить версию?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить {versionToDelete?.is_primary_variant 
                ? 'оригинальную версию' 
                : `вариант ${versionToDelete?.variant_index}`}.
              {versionToDelete?.is_preferred_variant && !versionToDelete?.is_primary_variant && (
                <span className="block mt-2 text-orange-500 font-medium">
                  ⚠️ Это главная версия. Статус главной будет присвоен другой версии.
                </span>
              )}
              <span className="block mt-2">
                Это действие нельзя отменить.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteVersion}
              className="bg-destructive hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Экспортируем мемоизированный компонент
export const TrackVersions = memo(TrackVersionsComponent);
