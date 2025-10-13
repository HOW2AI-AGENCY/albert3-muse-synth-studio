import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Download, Volume2, VolumeX } from "@/utils/iconImports";
import { cn } from "@/lib/utils";

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  version_id?: string | null;
  created_at?: string;
}

interface StemCardProps {
  stem: TrackStem;
  isPlaying: boolean;
  isMuted?: boolean;
  onPlay: () => void;
  onPause: () => void;
  onDownload: () => void;
  onMuteToggle?: () => void;
}

const stemIcons: Record<string, string> = {
  vocals: "🎤",
  backing_vocals: "🎙️",
  instrumental: "🎹",
  drums: "🥁",
  bass: "🎸",
  guitar: "🎸",
  keyboard: "🎹",
  strings: "🎻",
  brass: "🎺",
  woodwinds: "🎷",
  percussion: "🔊",
  synth: "🎛️",
  fx: "✨",
};

const stemTypeLabels: Record<string, string> = {
  vocals: "Вокал",
  backing_vocals: "Бэк-вокал",
  instrumental: "Инструментал",
  original: "Оригинал",
  drums: "Ударные",
  bass: "Бас",
  guitar: "Гитара",
  keyboard: "Клавишные",
  strings: "Струнные",
  brass: "Духовые (медные)",
  woodwinds: "Духовые (деревянные)",
  percussion: "Перкуссия",
  synth: "Синтезатор",
  fx: "Эффекты",
};

const formatStemLabel = (stemType: string) => {
  if (stemTypeLabels[stemType]) {
    return stemTypeLabels[stemType];
  }
  return stemType
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

export const StemCard = ({
  stem,
  isPlaying,
  isMuted,
  onPlay,
  onPause,
  onDownload,
  onMuteToggle,
}: StemCardProps) => {
  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-300",
        "hover:shadow-lg hover:scale-[1.02]",
        "border-border/50 hover:border-primary/30",
        isPlaying && "ring-2 ring-primary/50 shadow-primary/20"
      )}
    >
      {/* Animated background gradient */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br opacity-0",
          "group-hover:opacity-10 transition-opacity duration-500",
          "from-primary/20 via-primary/10 to-transparent"
        )}
      />

      <div className="relative p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{stemIcons[stem.stem_type] || "🎵"}</span>
            <div>
              <h4 className="font-semibold text-sm">
                {formatStemLabel(stem.stem_type)}
              </h4>
              <Badge variant="outline" className="text-[10px] mt-0.5">
                {stem.separation_mode === 'separate_vocal' ? '2-stem' : 'multi-stem'}
              </Badge>
            </div>
          </div>

          {onMuteToggle && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={onMuteToggle}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>

        {/* Waveform placeholder */}
        <div className="h-12 rounded bg-muted/50 flex items-center justify-center overflow-hidden">
          <div className="flex items-end gap-0.5 h-full">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-1 bg-primary/30 rounded-t transition-all duration-300",
                  isPlaying && "animate-pulse"
                )}
                style={{
                  height: `${Math.random() * 60 + 20}%`,
                  animationDelay: `${i * 20}ms`,
                }}
              />
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={isPlaying ? "default" : "outline"}
            className="flex-1"
            onClick={isPlaying ? onPause : onPlay}
          >
            {isPlaying ? (
              <>
                <Pause className="h-3.5 w-3.5 mr-1.5" />
                Пауза
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Воспроизвести
              </>
            )}
          </Button>

          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9"
            onClick={onDownload}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
