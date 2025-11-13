import { memo, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, Star, Download } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { formatDuration } from "@/utils/formatters";
import { cn } from "@/lib/utils";
import { useTrackRollback } from "@/features/tracks/hooks/useTrackRollback";
import { toast } from "sonner";

interface MinimalVersionsListProps {
  trackId: string;
}

export const MinimalVersionsList = memo(({ trackId }: MinimalVersionsListProps) => {
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const queryClient = useQueryClient();
  const { rollbackToVersion } = useTrackRollback(trackId);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["track-versions-minimal", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("track_versions")
        .select("*")
        .eq("parent_track_id", trackId)
        .gte("variant_index", 1) // ✅ FIX P0: Only load variants >= 1 (no duplicates of main track)
        .order("variant_index", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!trackId,
  });

  const { data: mainTrack } = useQuery({
    queryKey: ["track-main", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tracks")
        .select("id, title, audio_url, cover_url, duration_seconds")
        .eq("id", trackId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!trackId,
  });

  const allVersions = useMemo(() => {
    if (mainTrack) {
      return [
        {
          id: mainTrack.id,
          variant_index: 0,
          audio_url: mainTrack.audio_url,
          cover_url: mainTrack.cover_url,
          duration: mainTrack.duration_seconds,
          // Основная версия не является записью в track_versions,
          // поэтому не показываем ей возможность стать мастер-версией
          is_preferred_variant: false,
          is_primary: true,
        },
        ...versions,
      ];
    }
    return versions;
  }, [mainTrack, versions]);

  // ✅ FIX P0: Show ALL versions, not just 2
  // Previous logic limited display to 2 versions, causing variants to be hidden
  const displayVersions = useMemo(() => {
    return allVersions;
  }, [allVersions]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (allVersions.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Нет версий</p>;
  }

  const handlePlay = (version: typeof allVersions[0]) => {
    if (!version.audio_url) return;
    playTrack({
      id: version.id,
      title: `Вариант ${version.variant_index}`,
      audio_url: version.audio_url,
      cover_url: version.cover_url || undefined,
      duration: version.duration || undefined,
    });
  };

  const handleDownload = (url?: string) => {
    if (!url) return;
    window.open(url, "_blank");
  };

  const handleSetMaster = async (versionId: string) => {
    try {
      await rollbackToVersion(versionId);
      toast.success("Выбрана мастер-версия");
      // Обновляем локальные запросы
      queryClient.invalidateQueries({ queryKey: ["track-versions-minimal", trackId] });
      queryClient.invalidateQueries({ queryKey: ["track-versions", trackId] });
    } catch {
      toast.error("Не удалось выбрать мастер-версию");
    }
  };

  return (
    <div className="space-y-1.5">
      {displayVersions.map((version, index) => {
        const isPlaying = currentTrack?.id === version.id;
        const isMain = !!(index === 0 && mainTrack);

        return (
          <div
            key={version.id}
            className={cn(
              "flex items-center gap-2 p-2 rounded-md border transition-all",
              isPlaying && "border-primary bg-primary/5"
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium truncate">
                  {isMain ? "Основная" : `V${version.variant_index}`}
                </p>
                {!isMain && version.is_preferred_variant && (
                  <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                )}
                {isPlaying && (
                  <Badge variant="default" className="text-[9px] h-3.5 px-1">
                    ▶
                  </Badge>
                )}
              </div>
              {version.duration && (
                <p className="text-[10px] text-muted-foreground">
                  {formatDuration(version.duration)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant={isPlaying ? "default" : "ghost"}
                onClick={() => handlePlay(version)}
                disabled={!version.audio_url}
                className="touch-target-min shrink-0"
                aria-label={`Воспроизвести ${isMain ? 'основную версию' : `версию V${version.variant_index}`}`}
              >
                <Play className="h-3 w-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => handleDownload(version.audio_url ?? undefined)}
                disabled={!version.audio_url}
                className="touch-target-min shrink-0"
                aria-label={`Скачать ${isMain ? 'основную' : `версию V${version.variant_index}`}`}
              >
                <Download className="h-3 w-3" />
              </Button>
              {!isMain && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleSetMaster(version.id)}
                  className="touch-target-min shrink-0"
                  aria-label={`Сделать мастер: V${version.variant_index}`}
                >
                  <Star className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

MinimalVersionsList.displayName = "MinimalVersionsList";
