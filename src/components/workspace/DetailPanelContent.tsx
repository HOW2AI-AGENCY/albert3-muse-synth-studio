// import { useState } from "react";
import { Download, Share2, Trash2, Eye, Heart, Calendar, Clock, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
// import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrackVersions } from "@/components/tracks/TrackVersions";
import { TrackStemsPanel } from "@/components/tracks/TrackStemsPanel";
import { useTrackLike } from "@/hooks/useTrackLike";
import { cn } from "@/lib/utils";
import { StyleRecommendationsPanel } from "./StyleRecommendationsPanel";
import type { StylePreset } from "@/types/styles";
import { getStyleById } from "@/data/music-styles";
import {
  createTrackDensityVars,
  getTrackDensityClasses,
  type TrackDensityMode,
} from "@/features/tracks/ui/density";

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
  metadata?: Record<string, unknown>;
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
  metadata?: Record<string, unknown>;
}

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
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
  densityMode?: TrackDensityMode;
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "—";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
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
  densityMode = "compact",
}: DetailPanelContentProps) => {
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const densityVars = createTrackDensityVars(densityMode);
  const densityClasses = getTrackDensityClasses(densityMode);

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

  return (
    <TooltipProvider delayDuration={200}>
      <div
        data-testid="detail-panel-content"
        className={cn(
          "p-[var(--track-density-panel-padding)]",
          "space-y-[var(--track-density-section-gap)]",
          densityClasses.fontSizeClass
        )}
        style={densityVars}
      >
        {/* Quick Actions - только иконки */}
        <div className="flex items-center justify-center gap-[var(--track-density-action-gap)]">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className={cn(
                  "relative",
                  "rounded-full",
                  isLiked && "text-red-500"
                )}
                style={{
                  width: "var(--track-density-icon-button-size)",
                  height: "var(--track-density-icon-button-size)",
                }}
                onClick={() => toggleLike()}
                aria-label={isLiked ? "Убрать из избранного" : "Добавить в избранное"}
              >
                <Heart
                  className={cn(
                    "transition-colors",
                    isLiked && "fill-current",
                    "h-[var(--track-density-icon-size)] w-[var(--track-density-icon-size)]"
                  )}
                />
                {likeCount > 0 && (
                  <Badge
                    className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px]"
                    style={{ padding: "var(--track-density-badge-padding, 0)" }}
                  >
                    {likeCount}
                  </Badge>
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="text-xs">
              Избранное
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                style={{
                  width: "var(--track-density-icon-button-size)",
                  height: "var(--track-density-icon-button-size)",
                }}
                onClick={onDownload}
                disabled={!track.audio_url}
                aria-label="Скачать MP3"
              >
                <Download className="h-[var(--track-density-icon-size)] w-[var(--track-density-icon-size)]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="text-xs">
              Скачать MP3
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                style={{
                  width: "var(--track-density-icon-button-size)",
                  height: "var(--track-density-icon-button-size)",
                }}
                onClick={onShare}
                aria-label="Поделиться"
              >
                <Share2 className="h-[var(--track-density-icon-size)] w-[var(--track-density-icon-size)]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent sideOffset={6} className="text-xs">
              Поделиться
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Collapsible Sections */}
        <Accordion
          type="multiple"
          defaultValue={["metadata"]}
          className="space-y-[var(--track-density-section-gap)]"
        >
        {/* Versions */}
        {versions.length > 0 && (
          <AccordionItem
            value="versions"
            className="overflow-hidden rounded-[var(--track-density-section-radius)] border border-border/40 bg-card/50 backdrop-blur"
          >
            <AccordionTrigger
              className={cn(
                "hover:no-underline font-medium",
                densityClasses.fontSizeClass,
                "px-[var(--track-density-section-padding-inline)] py-[var(--track-density-section-padding-block)]"
              )}
            >
              Версии ({versions.length})
            </AccordionTrigger>
            <AccordionContent
              className="px-[var(--track-density-section-padding-inline)] pb-[var(--track-density-section-padding-block)]"
            >
              <TrackVersions
                trackId={track.id}
                versions={versions}
                onVersionUpdate={loadVersionsAndStems}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Stems */}
        {track.status === 'completed' && track.audio_url && (
          <AccordionItem
            value="stems"
            className="overflow-hidden rounded-[var(--track-density-section-radius)] border border-border/40 bg-card/50 backdrop-blur"
          >
            <AccordionTrigger
              className={cn(
                "hover:no-underline font-medium",
                densityClasses.fontSizeClass,
                "px-[var(--track-density-section-padding-inline)] py-[var(--track-density-section-padding-block)]"
              )}
            >
              Стемы {stems.length > 0 && `(${stems.length})`}
            </AccordionTrigger>
            <AccordionContent
              className="px-[var(--track-density-section-padding-inline)] pb-[var(--track-density-section-padding-block)]"
            >
              <TrackStemsPanel
                trackId={track.id}
                stems={stems}
                onStemsGenerated={loadVersionsAndStems}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Metadata */}
        <AccordionItem
          value="metadata"
          className="overflow-hidden rounded-[var(--track-density-section-radius)] border border-border/40 bg-card/50 backdrop-blur"
        >
          <AccordionTrigger
            className={cn(
              "hover:no-underline font-medium",
              densityClasses.fontSizeClass,
              "px-[var(--track-density-section-padding-inline)] py-[var(--track-density-section-padding-block)]"
            )}
          >
            Метаданные
          </AccordionTrigger>
          <AccordionContent
            className="space-y-[var(--track-density-field-gap)] px-[var(--track-density-section-padding-inline)] pb-[var(--track-density-section-padding-block)]"
          >
            {/* Название без лейбла */}
            <div className="relative">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название трека"
                className={cn("px-3", densityClasses.fontSizeClass)}
                style={{ height: "var(--track-density-control-height)" }}
              />
            </div>

            {/* Жанр и Настроение в одной строке без лейблов */}
            <div className="grid grid-cols-2 gap-[var(--track-density-field-gap)]">
              <div className="relative">
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Жанр"
                  className={cn("px-3", densityClasses.fontSizeClass)}
                  style={{ height: "var(--track-density-control-height)" }}
                />
              </div>

              <div className="relative">
                <Input
                  id="mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="Настроение"
                  className={cn("px-3", densityClasses.fontSizeClass)}
                  style={{ height: "var(--track-density-control-height)" }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-[var(--track-density-section-padding-block)]">
              <div className="space-y-0.5">
                <Label className={cn("font-medium", densityClasses.labelSizeClass)}>Публичный</Label>
                <p className="text-[0.7rem] text-muted-foreground">Доступен всем</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <Button
              size="sm"
              className="w-full"
              style={{ height: "var(--track-density-control-height)" }}
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="ai-style"
          className="overflow-hidden rounded-[var(--track-density-section-radius)] border border-border/40 bg-card/50 backdrop-blur"
        >
          <AccordionTrigger
            className={cn(
              "hover:no-underline font-medium",
              densityClasses.fontSizeClass,
              "px-[var(--track-density-section-padding-inline)] py-[var(--track-density-section-padding-block)]"
            )}
          >
            AI рекомендации по стилю
          </AccordionTrigger>
          <AccordionContent
            className="px-[var(--track-density-section-padding-inline)] pb-[var(--track-density-section-padding-block)]"
          >
            <StyleRecommendationsPanel
              mood={mood}
              genre={genre}
              context={track.prompt}
              currentTags={track.style_tags ?? []}
              onApplyPreset={handlePresetApply}
              onApplyTags={handleTagsApply}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Tags & Details */}
        {(track.style_tags && track.style_tags.length > 0 || track.suno_id || track.model_name || track.lyrics) && (
          <AccordionItem
            value="details"
            className="overflow-hidden rounded-[var(--track-density-section-radius)] border border-border/40 bg-card/50 backdrop-blur"
          >
            <AccordionTrigger
              className={cn(
                "hover:no-underline font-medium",
                densityClasses.fontSizeClass,
                "px-[var(--track-density-section-padding-inline)] py-[var(--track-density-section-padding-block)]"
              )}
            >
              Детали
            </AccordionTrigger>
            <AccordionContent
              className="space-y-[var(--track-density-field-gap)] px-[var(--track-density-section-padding-inline)] pb-[var(--track-density-section-padding-block)]"
            >
              {/* Style Tags */}
              {track.style_tags && track.style_tags.length > 0 && (
                <div className="space-y-2">
                  <Label className={cn("font-medium", densityClasses.labelSizeClass)}>Теги стиля</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {track.style_tags.map((tag: string, i: number) => (
                      <Badge
                        key={i}
                        variant="secondary"
                        className="text-xs"
                        style={{ padding: "var(--track-density-badge-padding)" }}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suno Details */}
              {(track.suno_id || track.model_name) && (
                <div className="space-y-2">
                  <Label className={cn("font-medium", densityClasses.labelSizeClass)}>Генерация</Label>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {track.model_name && <p>Модель: {track.model_name}</p>}
                    {track.suno_id && <p className="font-mono text-xs">ID: {track.suno_id}</p>}
                  </div>

                  {track.suno_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn("w-full justify-start", densityClasses.fontSizeClass)}
                      style={{ height: "var(--track-density-control-height)" }}
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
                      className={cn("w-full justify-start", densityClasses.fontSizeClass)}
                      style={{ height: "var(--track-density-control-height)" }}
                      onClick={() => window.open(track.video_url, "_blank")}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Видео
                    </Button>
                  )}
                </div>
              )}

              {/* Lyrics */}
              {track.lyrics && (
                <div className="space-y-2">
                  <Label className={cn("font-medium", densityClasses.labelSizeClass)}>Текст</Label>
                  <Textarea
                    value={track.lyrics}
                    readOnly
                    className={cn("min-h-[100px] resize-none", densityClasses.fontSizeClass)}
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Statistics - только иконки и цифры */}
        <AccordionItem
          value="stats"
          className="overflow-hidden rounded-[var(--track-density-section-radius)] border border-border/40 bg-card/50 backdrop-blur"
        >
          <AccordionTrigger
            className={cn(
              "hover:no-underline font-medium",
              densityClasses.fontSizeClass,
              "px-[var(--track-density-section-padding-inline)] py-[var(--track-density-section-padding-block)]"
            )}
          >
            Статистика
          </AccordionTrigger>
          <AccordionContent
            className="px-[var(--track-density-section-padding-inline)] pb-[var(--track-density-section-padding-block)]"
          >
            <div className="grid grid-cols-2 gap-[var(--track-density-field-gap)]">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Eye className="text-muted-foreground h-[calc(var(--track-density-icon-size)*0.85)] w-[calc(var(--track-density-icon-size)*0.85)]" />
                    <span className="font-medium">{track.view_count || 0}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Просмотры</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Heart className="text-muted-foreground h-[calc(var(--track-density-icon-size)*0.85)] w-[calc(var(--track-density-icon-size)*0.85)]" />
                    <span className="font-medium">{track.like_count || 0}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Лайки</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="text-muted-foreground h-[calc(var(--track-density-icon-size)*0.85)] w-[calc(var(--track-density-icon-size)*0.85)]" />
                    <span className="font-medium text-xs">{track.created_at ? formatDate(track.created_at) : '—'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Дата создания</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="text-muted-foreground h-[calc(var(--track-density-icon-size)*0.85)] w-[calc(var(--track-density-icon-size)*0.85)]" />
                    <span className="font-medium">{formatDuration(track.duration_seconds)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="text-xs">Длительность</TooltipContent>
              </Tooltip>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Prompt */}
        <AccordionItem
          value="prompt"
          className="overflow-hidden rounded-[var(--track-density-section-radius)] border border-border/40 bg-card/50 backdrop-blur"
        >
          <AccordionTrigger
            className={cn(
              "hover:no-underline font-medium",
              densityClasses.fontSizeClass,
              "px-[var(--track-density-section-padding-inline)] py-[var(--track-density-section-padding-block)]"
            )}
          >
            Промпт
          </AccordionTrigger>
          <AccordionContent
            className="px-[var(--track-density-section-padding-inline)] pb-[var(--track-density-section-padding-block)]"
          >
            <div
              className={cn(
                "rounded-md bg-muted/70 text-muted-foreground",
                densityClasses.fontSizeClass,
                "p-3"
              )}
            >
              {track.prompt}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Danger Zone */}
      <div className="space-y-2 pt-[var(--track-density-section-gap)]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              style={{ height: "var(--track-density-control-height)" }}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Удалить трек
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Удалить трек безвозвратно</TooltipContent>
        </Tooltip>
      </div>
    </div>
    </TooltipProvider>
  );
};
