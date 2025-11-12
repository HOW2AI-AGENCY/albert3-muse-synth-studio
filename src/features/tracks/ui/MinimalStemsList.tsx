import { memo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Play } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { cn } from "@/lib/utils";

interface MinimalStemsListProps {
  trackId: string;
}

const STEM_LABELS: Record<string, string> = {
  vocals: "🎤 Вокал",
  instrumental: "🎹 Инструментал",
  drums: "🥁 Ударные",
  bass: "🎸 Бас",
  guitar: "🎸 Гитара",
  piano: "🎹 Пиано",
  synth: "🎛️ Синт",
  strings: "🎻 Струнные",
  brass: "🎺 Духовые",
  other: "🎵 Другое",
};

export const MinimalStemsList = memo(({ trackId }: MinimalStemsListProps) => {
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);

  const { data: stems = [], isLoading } = useQuery({
    queryKey: ["track-stems-minimal", trackId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("track_stems")
        .select("*")
        .eq("track_id", trackId)
        .order("stem_type", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!trackId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (stems.length === 0) {
    return <p className="text-xs text-muted-foreground text-center py-4">Нет стемов</p>;
  }

  const handlePlay = (stem: typeof stems[0]) => {
    playTrack({
      id: stem.id,
      title: STEM_LABELS[stem.stem_type] || stem.stem_type,
      audio_url: stem.audio_url,
    });
  };

  return (
    <div className="space-y-1.5">
      {stems.map((stem) => {
        const isPlaying = currentTrack?.id === stem.id;
        const label = STEM_LABELS[stem.stem_type] || stem.stem_type;

        return (
          <div
            key={stem.id}
            className={cn(
              "flex items-center justify-between p-2 rounded-md border transition-all",
              isPlaying && "border-primary bg-primary/5"
            )}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{label}</p>
              {stem.separation_mode && (
                <Badge variant="outline" className="text-[9px] h-3.5 px-1">
                  {stem.separation_mode === "split_stem" ? "12-stem" : "2-stem"}
                </Badge>
              )}
            </div>

            <Button
              size="icon"
              variant={isPlaying ? "default" : "ghost"}
              onClick={() => handlePlay(stem)}
              className="touch-target-min shrink-0"
              aria-label={`Воспроизвести ${label}`}
            >
              <Play className="h-3 w-3" />
            </Button>
          </div>
        );
      })}
    </div>
  );
});

MinimalStemsList.displayName = "MinimalStemsList";
