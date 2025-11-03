import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play, Star } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { formatDuration } from "@/utils/formatters";
import { cn } from "@/lib/utils";

interface MinimalVersionsListProps {
  trackId: string;
}

export const MinimalVersionsList = memo(({ trackId }: MinimalVersionsListProps) => {
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["track-versions-minimal", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("track_versions")
        .select("*")
        .eq("parent_track_id", trackId)
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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  const allVersions = mainTrack
    ? [
        {
          id: mainTrack.id,
          variant_index: 0,
          audio_url: mainTrack.audio_url,
          cover_url: mainTrack.cover_url,
          duration: mainTrack.duration_seconds,
          is_preferred_variant: true,
          is_primary: true,
        },
        ...versions,
      ]
    : versions;

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

  return (
    <div className="space-y-1.5">
      {allVersions.map((version, index) => {
        const isPlaying = currentTrack?.id === version.id;
        const isMain = index === 0;

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
                {version.is_preferred_variant && (
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

            <Button
              size="icon"
              variant={isPlaying ? "default" : "ghost"}
              onClick={() => handlePlay(version)}
              disabled={!version.audio_url}
              className="h-7 w-7 shrink-0"
            >
              <Play className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
});

MinimalVersionsList.displayName = "MinimalVersionsList";
