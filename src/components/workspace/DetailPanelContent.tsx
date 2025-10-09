import { useEffect, useMemo, useState } from "react";
import { Download, Share2, Trash2, Eye, Heart, Calendar, Clock, ExternalLink, Play } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrackVersions, TrackStemsPanel, useTrackLike } from "@/features/tracks";
import type { TrackVersionMetadata } from "@/features/tracks/components/TrackVersionMetadataPanel";
import { TrackDetailsPanel } from "@/features/tracks/ui/TrackDetailsPanel";
import { TrackVersionSelector } from "@/features/tracks/ui/TrackVersionSelector";
import { cn } from "@/lib/utils";
import { StyleRecommendationsPanel } from "./StyleRecommendationsPanel";
import type { StylePreset } from "@/types/styles";
import { getStyleById } from "@/data/music-styles";
import { AnalyticsService, viewSessionGuard } from "@/services/analytics.service";

interface Track {
  id: string;
  title: string;
  prompt: string;
  status: string;
  audio_url?: string;
  cover_url?: string;
  video_url?: string;
  suno_id?: string;
  genre?: string;
  mood?: string;
  is_public?: boolean;
  created_at?: string;
  user_id?: string;
  duration?: number;
  lyrics?: string;
  metadata?: TrackVersionMetadata | null;
  like_count?: number;
  view_count?: number;
  duration_seconds?: number;
  style_tags?: string[];
  model_name?: string;
}

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
  created_at?: string;
}

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  version_id?: string | null;
  created_at?: string;
}

interface DetailPanelContentProps {
  track: Track;
  title: string;
  setTitle: (value: string) => void;
  genre: string;
  setGenre: (value: string) => void;
  mood: string;
  setMood: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  isSaving: boolean;
  versions: TrackVersion[];
  stems: TrackStem[];
  onSave: () => void;
  onDownload: () => void;
  onShare: () => void;
  onDelete: () => void;
  loadVersionsAndStems: () => void;
}

const formatDate = (date?: string) => {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch (error) {
    console.error("Failed to format date", error);
    return "—";
  }
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export const DetailPanelContent = ({
  track,
  title,
  setTitle,
  genre,
  setGenre,
  mood,
  setMood,
  isPublic,
  setIsPublic,
  isSaving,
  versions,
  stems,
  onSave,
  onDownload,
  onShare,
  onDelete,
  loadVersionsAndStems,
}: DetailPanelContentProps) => {
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const [selectedVersionId, setSelectedVersionId] = useState<string | undefined>();

  useEffect(() => {
    if (!track?.id) {
      return;
    }

    const hasView = viewSessionGuard.has(track.id);

    AnalyticsService.recordView(track.id).catch((error) => {
      console.error('Failed to record track view', error);
    });

    if (track.status === 'completed' && !hasView) {
      AnalyticsService.recordPlay(track.id).catch((error) => {
        console.error('Failed to record track play', error);
      });
    }
  }, [track?.id, track.status]);

  useEffect(() => {
    if (!versions?.length) {
      setSelectedVersionId(undefined);
      return;
    }

    setSelectedVersionId((current) => {
      if (current && versions.some((version) => version.id === current)) {
        return current;
      }

      const masterVersion = versions.find((version) => version.is_master);
      return masterVersion?.id ?? versions[0].id;
    });
  }, [versions]);

  const activeVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId),
    [versions, selectedVersionId]
  );

  const filteredStems = useMemo(() => {
    if (!selectedVersionId) {
      return stems;
    }

    return stems.filter((stem) => !stem.version_id || stem.version_id === selectedVersionId);
  }, [stems, selectedVersionId]);

  const handlePresetApply = (preset: StylePreset) => {
    const presetGenre = preset.styleIds
      .map(styleId => getStyleById(styleId)?.name ?? styleId)
      .join(", ");

    if (presetGenre) {
      setGenre(presetGenre);
    }
  };

  const handleTagsApply = (tags: string[]) => {
    if (!tags.length) {
      return;
    }

    setMood(tags.slice(0, 3).join(", "));
  };

  const createdAtToDisplay = activeVersion?.created_at ?? track.created_at;
  const durationToDisplay = activeVersion?.duration ?? track.duration_seconds;

  return (
    <TooltipProvider delayDuration={500}>
      <div className="p-4 sm:p-6 space-y-6 lg:space-y-8">
        <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "relative",
                  isLiked && "text-red-500"
                )}
                onClick={() => toggleLike()}
              >
                <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
                {likeCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
                    {likeCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Избранное</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDownload}
                disabled={!track.audio_url}
              >
                <Download className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Скачать MP3</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={onShare}>
                <Share2 className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Поделиться</TooltipContent>
          </Tooltip>
        </div>

        <TrackDetailsPanel track={track} activeVersion={activeVersion ?? null} />

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4 lg:space-y-6">
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Метаданные</CardTitle>
                <CardDescription>Обновите ключевую информацию и видимость трека.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Название трека"
                  className="h-10 text-sm"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    id="genre"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    placeholder="Жанр"
                    className="h-10 text-sm"
                  />

                  <Input
                    id="mood"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    placeholder="Настроение"
                    className="h-10 text-sm"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-md border border-border/60 bg-background/60 p-3">
                  <div className="space-y-0.5">
                    <Label className="text-sm">Публичный доступ</Label>
                    <p className="text-xs text-muted-foreground">Трек будет доступен всем пользователям.</p>
                  </div>
                  <Switch checked={isPublic} onCheckedChange={setIsPublic} />
                </div>

                <Button size="default" className="w-full" onClick={onSave} disabled={isSaving}>
                  {isSaving ? "Сохранение..." : "Сохранить изменения"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">AI рекомендации по стилю</CardTitle>
                <CardDescription>Подберите подходящие жанры и теги с помощью ассистента.</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <StyleRecommendationsPanel
                  mood={mood}
                  genre={genre}
                  context={track.prompt}
                  currentTags={track.style_tags ?? []}
                  onApplyPreset={handlePresetApply}
                  onApplyTags={handleTagsApply}
                />
              </CardContent>
            </Card>

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
                      Удалить трек
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Удалить трек безвозвратно</TooltipContent>
                </Tooltip>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 lg:space-y-6">
            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Версии трека</CardTitle>
                <CardDescription>Переключайтесь между версиями и управляйте статусом.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TrackVersionSelector
                  versions={versions.map((version) => ({
                    id: version.id,
                    version_number: version.version_number,
                    created_at: version.created_at,
                    is_master: version.is_master,
                  }))}
                  selectedVersionId={selectedVersionId}
                  onSelect={setSelectedVersionId}
                />
                <TrackVersions
                  trackId={track.id}
                  versions={versions}
                  trackMetadata={track.metadata ?? null}
                  onVersionUpdate={loadVersionsAndStems}
                />
              </CardContent>
            </Card>

            {track.status === 'completed' && track.audio_url && (
              <Card className="border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Стемы</CardTitle>
                  <CardDescription>Создавайте и управляйте стемами выбранной версии.</CardDescription>
                </CardHeader>
                <CardContent>
                  <TrackStemsPanel
                    trackId={track.id}
                    versionId={selectedVersionId}
                    stems={filteredStems}
                    onStemsGenerated={loadVersionsAndStems}
                  />
                </CardContent>
              </Card>
            )}

            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Статистика</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <StatsItem icon={Eye} label="Просмотры" value={`${track.view_count || 0}`} />
                <StatsItem icon={Heart} label="Лайки" value={`${track.like_count || 0}`} />
                <StatsItem icon={Calendar} label="Создан" value={formatDate(createdAtToDisplay)} />
                <StatsItem icon={Clock} label="Длительность" value={formatDuration(durationToDisplay)} />
              </CardContent>
            </Card>

            <Card className="border-border/70">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Промпт</CardTitle>
                <CardDescription>Исходный запрос, использованный при генерации трека.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-3 rounded-md bg-muted text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                  {track.prompt}
                </div>
              </CardContent>
            </Card>

            {(track.suno_id || track.model_name || track.lyrics) && (
              <Card className="border-border/70">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Детали генерации</CardTitle>
                  <CardDescription>Дополнительные сведения о создании трека.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  {(track.model_name || track.suno_id) && (
                    <div className="space-y-2">
                      {track.model_name && <p>Модель: {track.model_name}</p>}
                      {track.suno_id && <p className="font-mono text-xs">ID: {track.suno_id}</p>}

                      {track.suno_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start h-9 text-sm"
                          onClick={() => window.open(`https://suno.com/song/${track.suno_id}`, "_blank")}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Открыть в Suno
                        </Button>
                      )}

                      {track.video_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start h-9 text-sm"
                          onClick={() => window.open(track.video_url, "_blank")}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Видео
                        </Button>
                      )}
                    </div>
                  )}

                  {track.lyrics && (
                    <div className="space-y-2">
                      <Label className="text-sm">Текст</Label>
                      <Textarea
                        value={track.lyrics}
                        readOnly
                        className="min-h-[120px] resize-none text-sm"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

interface StatsItemProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

const StatsItem = ({ icon: Icon, label, value }: StatsItemProps) => (
  <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-background/60 p-3">
    <div className="flex items-center gap-2 text-sm">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-muted-foreground">{label}</span>
    </div>
    <span className="font-medium text-sm">{value}</span>
  </div>
);
