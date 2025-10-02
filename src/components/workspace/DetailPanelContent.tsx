import { useState } from "react";
import { Download, Share2, Trash2, Eye, Heart, Calendar, Clock, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TrackVersions } from "@/components/tracks/TrackVersions";
import { TrackStemsPanel } from "@/components/tracks/TrackStemsPanel";

interface DetailPanelContentProps {
  track: any;
  title: string;
  setTitle: (value: string) => void;
  genre: string;
  setGenre: (value: string) => void;
  mood: string;
  setMood: (value: string) => void;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  isSaving: boolean;
  versions: any[];
  stems: any[];
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
  return (
    <div className="p-3 space-y-3">
      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" size="sm" onClick={onDownload} disabled={!track.audio_url}>
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Скачать
        </Button>
        <Button variant="outline" size="sm" onClick={onShare}>
          <Share2 className="h-3.5 w-3.5 mr-1.5" />
          Поделиться
        </Button>
      </div>

      {/* Collapsible Sections */}
      <Accordion type="multiple" defaultValue={["versions", "metadata"]} className="space-y-2">
        {/* Versions */}
        {versions.length > 0 && (
          <AccordionItem value="versions" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm py-2 hover:no-underline">
              Версии ({versions.length})
            </AccordionTrigger>
            <AccordionContent className="pb-2">
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
          <AccordionItem value="stems" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm py-2 hover:no-underline">
              Стемы {stems.length > 0 && `(${stems.length})`}
            </AccordionTrigger>
            <AccordionContent className="pb-2">
              <TrackStemsPanel
                trackId={track.id}
                stems={stems}
                onStemsGenerated={loadVersionsAndStems}
              />
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Metadata */}
        <AccordionItem value="metadata" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            Метаданные
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-2">
            <div className="space-y-2">
              <Label htmlFor="title" className="text-xs">Название</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название трека"
                className="h-8 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="genre" className="text-xs">Жанр</Label>
                <Input
                  id="genre"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="Electronic"
                  className="h-8 text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mood" className="text-xs">Настроение</Label>
                <Input
                  id="mood"
                  value={mood}
                  onChange={(e) => setMood(e.target.value)}
                  placeholder="Energetic"
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <div className="space-y-0.5">
                <Label className="text-xs">Публичный</Label>
                <p className="text-[10px] text-muted-foreground">Доступен всем</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>

            <Button size="sm" className="w-full" onClick={onSave} disabled={isSaving}>
              {isSaving ? "Сохранение..." : "Сохранить"}
            </Button>
          </AccordionContent>
        </AccordionItem>

        {/* Tags & Details */}
        {(track.style_tags?.length > 0 || track.suno_id || track.model_name || track.lyrics) && (
          <AccordionItem value="details" className="border rounded-lg px-3">
            <AccordionTrigger className="text-sm py-2 hover:no-underline">
              Детали
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pb-2">
              {/* Style Tags */}
              {track.style_tags && track.style_tags.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Теги стиля</Label>
                  <div className="flex flex-wrap gap-1">
                    {track.style_tags.map((tag: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Suno Details */}
              {(track.suno_id || track.model_name) && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Генерация</Label>
                  <div className="space-y-0.5 text-xs text-muted-foreground">
                    {track.model_name && <p>Модель: {track.model_name}</p>}
                    {track.suno_id && <p className="font-mono text-[10px]">ID: {track.suno_id}</p>}
                  </div>
                  
                  {track.suno_id && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-7 text-xs"
                      onClick={() => window.open(`https://suno.com/song/${track.suno_id}`, "_blank")}
                    >
                      <ExternalLink className="h-3 w-3 mr-1.5" />
                      Открыть в Suno
                    </Button>
                  )}
                  
                  {track.video_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start h-7 text-xs"
                      onClick={() => window.open(track.video_url, "_blank")}
                    >
                      <Play className="h-3 w-3 mr-1.5" />
                      Видео
                    </Button>
                  )}
                </div>
              )}

              {/* Lyrics */}
              {track.lyrics && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Текст</Label>
                  <Textarea
                    value={track.lyrics}
                    readOnly
                    className="min-h-[80px] resize-none text-xs"
                  />
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Statistics */}
        <AccordionItem value="stats" className="border rounded-lg px-3">
          <AccordionTrigger className="text-sm py-2 hover:no-underline">
            Статистика
          </AccordionTrigger>
          <AccordionContent className="pb-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-xs">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Просмотры:</span>
                <span className="font-medium">{track.view_count || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Лайки:</span>
                <span className="font-medium">{track.like_count || 0}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Создан:</span>
                <span className="font-medium">{formatDate(track.created_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Длина:</span>
                <span className="font-medium">{formatDuration(track.duration_seconds)}</span>
              </div>
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
        <Button variant="destructive" size="sm" className="w-full" onClick={onDelete}>
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          Удалить трек
        </Button>
      </div>
    </div>
  );
};
