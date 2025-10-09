import { useState, memo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Star, Music2, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
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
import { deleteTrackVersion, updateTrackVersion } from "../api/trackVersions";

interface TrackVersion {
  id: string;
  version_number: number;
  is_master: boolean;
  suno_id: string;
  audio_url: string;
  video_url?: string;
  cover_url?: string;
  lyrics?: string;
  duration?: number;
  metadata?: TrackVersionMetadata | null;
}

interface TrackVersionsProps {
  trackId: string;
  versions: TrackVersion[];
  trackMetadata?: TrackVersionMetadata | null;
  onVersionUpdate?: () => void;
}

const TrackVersionsComponent = ({ trackId, versions, trackMetadata, onVersionUpdate }: TrackVersionsProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [versionToDelete, setVersionToDelete] = useState<TrackVersion | null>(null);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();
  const { vibrate } = useHapticFeedback();

  // Мемоизируем функцию установки мастер-версии
  const handleSetMaster = useCallback(async (versionId: string, versionNumber: number) => {
    try {
      vibrate('medium');
      
      // Unset all other masters for this track
      await Promise.all(
        versions
          .filter(version => version.id !== versionId && version.is_master)
          .map(async version => {
            const updateResult = await updateTrackVersion(version.id, { is_master: false });
            if (!updateResult.ok) {
              throw updateResult.error;
            }
          }),
      );

      // Set new master
      const updateResult = await updateTrackVersion(versionId, { is_master: true });
      if (!updateResult.ok) {
        throw updateResult.error;
      }

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
    
    logInfo(`Playing version ${version.version_number}`, 'TrackVersions', { 
      versionId: version.id, 
      versionNumber: version.version_number,
      trackId 
    });
    
    // Используем реальный ID версии вместо синтетического
    const isCurrentVersion = currentTrack?.id === version.id;

    if (isCurrentVersion && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: version.id, // Реальный UUID версии
        title: `Версия ${version.version_number}`,
        audio_url: version.audio_url,
        cover_url: version.cover_url,
        duration: version.duration,
        status: 'completed',
        style_tags: [],
        lyrics: version.lyrics,
        parentTrackId: trackId, // ID основного трека
        versionNumber: version.version_number, // Номер версии
        isMasterVersion: version.is_master, // Является ли мастер-версией
      });
    }
  }, [trackId, currentTrack, isPlaying, vibrate, togglePlayPause, playTrack]);

  // Мемоизируем функцию удаления версии
  const handleDeleteVersion = useCallback(async (version: TrackVersion) => {
    // Check if this is the last version
    if (versions.length === 1) {
      toast.error('Невозможно удалить единственную версию');
      return;
    }

    setVersionToDelete(version);
    setDeleteDialogOpen(true);
  }, [versions.length]);

  // Мемоизируем функцию подтверждения удаления
  const confirmDeleteVersion = useCallback(async () => {
    if (!versionToDelete) return;

    try {
      vibrate('warning');
      
      // If deleting master version, reassign to first remaining
      if (versionToDelete.is_master && versions.length > 1) {
        const nextVersion = versions.find(v => v.id !== versionToDelete.id);
        if (nextVersion) {
          const updateResult = await updateTrackVersion(nextVersion.id, { is_master: true });
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
      toast.success(`Версия ${versionToDelete.version_number} удалена`);
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

  // Мемоизируем функцию форматирования длительности
  const formatDuration = useCallback((seconds?: number) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  if (!versions || versions.length <= 1) {
    return null;
  }

  return (
    <div className="space-y-2 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music2 className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            Версии ({Math.max(versions.length - 1, 0)})
          </span>
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

      {isExpanded && (
        <div className="space-y-2 animate-fade-in">
          {versions.map((version) => {
            // Сравниваем с реальным ID версии
            const isCurrentVersion = currentTrack?.id === version.id;
            const isVersionPlaying = isCurrentVersion && isPlaying;

            return (
              <Card
                key={version.id}
                className={`p-3 transition-all hover:bg-muted/50 ${
                  version.is_master ? 'ring-2 ring-primary bg-primary/5' : ''
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
                              ? `Пауза версии ${version.version_number}`
                              : `Воспроизвести версию ${version.version_number}`
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
                              Версия {version.version_number}
                            </span>
                            {version.is_master && (
                              <Badge variant="default" className="gap-1 text-xs">
                                <Star className="w-3 h-3 fill-current" />
                                Главная
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDuration(version.duration)}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-1 sm:ml-auto">
                        {!version.is_master && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetMaster(version.id, version.version_number)}
                            aria-label={`Сделать версию ${version.version_number} главной`}
                            className="text-xs h-8 transition-transform active:scale-95"
                          >
                            <Star className="w-3 h-3 mr-1" />
                            <span className="hidden sm:inline">Сделать главной</span>
                            <span className="sm:hidden">Главная</span>
                          </Button>
                        )}

                        {versions.length > 1 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteVersion(version)}
                            aria-label={`Удалить версию ${version.version_number}`}
                            className="text-xs h-8 text-destructive hover:text-destructive transition-transform active:scale-95"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <TrackVersionMetadataPanel
                    metadata={version.metadata}
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
              Вы собираетесь удалить версию {versionToDelete?.version_number}.
              {versionToDelete?.is_master && (
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
