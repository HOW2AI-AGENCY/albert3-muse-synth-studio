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
}: DetailPanelContentProps) => {
  const { isLiked, likeCount, toggleLike } = useTrackLike(track.id, track.like_count || 0);

  return (
    <TooltipProvider delayDuration={500}>
    <div className="p-4 space-y-4">
      {/* Quick Actions - только иконки */}
      <div className="flex items-center justify-center gap-2">
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

      {/* Collapsible Sections */}
      <Accordion type="multiple" defaultValue={["metadata"]} className="space-y-3">
        {/* Versions */}
        {versions.length > 0 && (
          <AccordionItem value="versions" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm py-3 hover:no-underline">
              Версии ({versions.length})
            </AccordionTrigger>
            <AccordionContent className="pb-3">
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
          <AccordionItem value="stems" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm py-3 hover:no-underline">
              Стемы {stems.length > 0 && `(${stems.length})`}
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <TrackStemsPanel
                trackId={track.id}
                stems={stems}
                onStemsGenerated={loadVersionsAndStems}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Metadata */}
        <AccordionItem value="metadata" className="border rounded-lg px-4">
          <AccordionTrigger className="text-sm py-3 hover:no-underline">
            Метаданные
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-3">
            {/* Название без лейбла */}
            <div className="relative">
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название трека"
                className="h-10 text-sm"
              />
            </div>

            {/* Жанр и Настроение в одной строке без лейблов */}
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Жанр"
                  className="h-10 text-sm"
                />
              </div>

              <div className="relative">
                <Input
                  id="mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="Настроение"
                  className="h-10 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="space-y-0.5">
                <Label className="text-sm">Публичный</Label>
                <p className="text-xs text-muted-foreground">Доступен всем</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <Button size="default" className="w-full" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Tags & Details */}
        {(track.style_tags && track.style_tags.length > 0 || track.suno_id || track.model_name || track.lyrics) && (
          <AccordionItem value="details" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm py-3 hover:no-underline">
              Детали
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-3">
              {/* Style Tags */}
              {track.style_tags && track.style_tags.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm">Теги стиля</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {track.style_tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs px-2 py-0.5">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suno Details */}
              {(track.suno_id || track.model_name) && (
                <div className="space-y-2">
                  <Label className="text-sm">Генерация</Label>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    {track.model_name && <p>Модель: {track.model_name}</p>}
                    {track.suno_id && <p className="font-mono text-xs">ID: {track.suno_id}</p>}
                  </div>
                  
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

              {/* Lyrics */}
              {track.lyrics && (
                <div className="space-y-2">
                  <Label className="text-sm">Текст</Label>
                  <Textarea
                    value={track.lyrics}
                    readOnly
                    className="min-h-[100px] resize-none text-sm"
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Statistics - только иконки и цифры */}
        <AccordionItem value="stats" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            Статистика
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="grid grid-cols-2 gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{track.view_count || 0}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Просмотры</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{track.like_count || 0}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Лайки</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-xs">{track.created_at ? formatDate(track.created_at) : '—'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Дата создания</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{formatDuration(track.duration_seconds)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Длительность</TooltipContent>
              </Tooltip>
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Prompt */}
        <AccordionItem value="prompt" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            Промпт
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="p-2 rounded-md bg-muted text-xs text-muted-foreground">
              {track.prompt}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Danger Zone */}
      <div className="pt-2 space-y-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Удалить трек
            </Button>
          </TooltipTrigger>
          <TooltipContent>Удалить трек безвозвратно</TooltipContent>
        </Tooltip>
      </div>
    </div>
    </TooltipProvider>
  );
};
