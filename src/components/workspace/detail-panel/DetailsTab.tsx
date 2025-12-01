import { Trash2, ExternalLink, Loader2 } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StructuredLyrics } from "@/components/lyrics/legacy/StructuredLyrics";
import type { Track } from "./types";
import { useTimestampedLyrics } from "@/hooks/useTimestampedLyrics";

interface DetailsTabProps {
    track: Track;
    onDelete: () => void;
}

const LyricsDisplay = ({ track }: { track: Track }) => {
    if (track.lyrics) {
        return <StructuredLyrics lyrics={track.lyrics} />;
    }

    const { data: lyricsData, isLoading, isError } = useTimestampedLyrics({
        taskId: track.suno_task_id || track.mureka_task_id,
        audioId: track.suno_id,
        enabled: !track.lyrics,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Загрузка текста...</span>
            </div>
        );
    }

    if (isError || !lyricsData?.text) {
        return (
            <div className="text-sm text-muted-foreground p-4 text-center">
                Сгенерированный текст для этого трека недоступен.
            </div>
        );
    }

    return <StructuredLyrics lyrics={lyricsData.text} />;
};

export const DetailsTab = ({
    track,
    onDelete
}: DetailsTabProps) => {
    const lyricsPotentiallyAvailable = track.lyrics || track.suno_id || track.suno_task_id || track.mureka_task_id;

    return (
        <>
            {lyricsPotentiallyAvailable && (
              <Card className="bg-[var(--card-primary-bg)] border-[var(--card-primary-border)] shadow-[var(--card-primary-shadow)]">
                  <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Текст песни</CardTitle>
                      <CardDescription>Структурированный вывод секций и текста</CardDescription>
                  </CardHeader>
                  <CardContent>
                      <LyricsDisplay track={track} />
                  </CardContent>
              </Card>
            )}

            <Card className="bg-[var(--card-tertiary-bg)] border-[var(--card-tertiary-border)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Технические детали</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Модель:</span>
                  <span className="font-medium">{track.model_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suno ID:</span>
                  <span className="font-mono text-xs">{track.suno_id || "—"}</span>
                </div>
                  {track.video_url && <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(track.video_url || '', "_blank")}>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Открыть видео
                  </Button>}
              </CardContent>
            </Card>

            {track.prompt && <Card className="bg-[var(--card-tertiary-bg)] border-[var(--card-tertiary-border)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Промпт генерации</CardTitle>
                </CardHeader>
                <CardContent>
                  <pre className="text-xs bg-muted/50 p-3 rounded-md whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                    {track.prompt}
                  </pre>
                </CardContent>
              </Card>}

            <Card className="border border-destructive/40 bg-destructive/5">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-destructive">Опасная зона</CardTitle>
                <CardDescription>Удалите трек и все связанные данные без возможности восстановления.</CardDescription>
              </CardHeader>
              <CardContent>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
                      <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                      Удалить трек навсегда
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Удалить трек безвозвратно</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
        </>
    );
};
