import { memo, useState, useCallback, KeyboardEvent } from "react";
import { X, Play, Download, Share2, Heart, Info, Music, Settings, Trash2, Star, Bot, Users, Folder } from "@/utils/iconImports";
import { StructuredLyricsViewer } from "@/components/lyrics/StructuredLyricsViewer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
// Интеграция общего состояния трека с поддержкой версий
import { useTrackState } from "@/hooks/useTrackState";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { TrackService } from '@/services/tracks/track.service';
import { formatDuration, formatDate } from "@/utils/formatters";
import { MinimalStemsList } from "./MinimalStemsList";
import { UnifiedTrackActionsMenu } from "@/components/tracks/shared/TrackActionsMenu.unified";

interface Track {
  id: string;
  title: string;
  prompt: string;
  improved_prompt?: string;
  status: string;
  audio_url?: string;
  cover_url?: string;
  lyrics?: string;
  style_tags?: string[];
  genre?: string;
  mood?: string;
  is_public?: boolean;
  created_at: string;
  duration_seconds?: number;
  like_count?: number;
  play_count?: number;
  download_count?: number;
  view_count?: number;
  has_stems?: boolean;
  has_vocals?: boolean;
  provider?: string;
  model_name?: string;
  reference_audio_url?: string;
  metadata?: {
    ai_description?: string;
    genre?: string;
    mood?: string;
    tempo_bpm?: number;
    key?: string;
    instruments?: string[];
    personaId?: string;
    personaName?: string;
    activeProjectId?: string;
    activeProjectName?: string;
    inspoProjectId?: string;
    inspoProjectName?: string;
    [key: string]: unknown;
  };
}

interface MinimalDetailPanelProps {
  track: Track;
  onClose?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const MinimalDetailPanel = memo(({ track, onClose, onUpdate, onDelete }: MinimalDetailPanelProps) => {
  const [title, setTitle] = useState(track.title);
  const [isPublic, setIsPublic] = useState(track.is_public || false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState<string | undefined>("info");
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const {
    isPlaying,
    displayedVersion,
    isLiked,
    handleLikeClick,
    handleVersionChange,
    operationTargetId,
    allVersions,
  } = useTrackState({
    id: track.id,
    title: track.title,
    audio_url: track.audio_url,
    cover_url: track.cover_url,
    duration: track.duration_seconds,
    status: track.status as any,
    style_tags: track.style_tags || [],
    lyrics: track.lyrics,
    parentTrackId: track.id,
  } as any);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .update({ title, is_public: isPublic })
        .eq("id", track.id);

      if (error) throw error;

      toast({ title: "✅ Сохранено" });
      onUpdate?.();
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось сохранить", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [title, isPublic, track.id, onUpdate]);

  const handleDelete = useCallback(async () => {
    if (!confirm("Удалить трек безвозвратно?")) return;

    try {
      await TrackService.deleteTrackCompletely(track.id);
      toast({ title: "🗑️ Удалено" });
      onDelete?.();
      onClose?.();
    } catch (error) {
      toast({ title: "Ошибка удаления", variant: "destructive" });
    }
  }, [track.id, onDelete, onClose]);

  const handlePlay = useCallback(() => {
    if (!displayedVersion?.audio_url) return;
    playTrack({
      id: displayedVersion.id,
      title: track.title,
      audio_url: displayedVersion.audio_url,
      cover_url: displayedVersion.cover_url,
      duration: displayedVersion.duration ?? track.duration_seconds,
      status: track.status as any,
      style_tags: track.style_tags || [],
      lyrics: track.lyrics,
      parentTrackId: track.id,
      versionNumber: displayedVersion.versionNumber,
      isMasterVersion: displayedVersion.isMasterVersion,
    });
  }, [displayedVersion, track, playTrack]);

  const handleDownload = useCallback(() => {
    if (track.audio_url) window.open(track.audio_url, "_blank");
  }, [track.audio_url]);

  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/track/${track.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "🔗 Ссылка скопирована" });
  }, [track.id]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-card/50 shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Badge 
            variant={track.status === "completed" ? "default" : "secondary"}
            className="text-[10px] h-5 px-1.5 shrink-0"
          >
            {track.status === "completed" ? "✅" : "⏳"}
          </Badge>
          <h2 className="text-sm font-semibold truncate">{track.title}</h2>
        </div>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="touch-target-min shrink-0" aria-label="Закрыть панель">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2.5">
          {/* Hero Section - Compact */}
          <div className="flex gap-2.5">
            {displayedVersion?.cover_url && (
              <div className="w-20 h-20 rounded-lg overflow-hidden border border-border/40 shrink-0 shadow-sm">
                <img src={displayedVersion.cover_url} alt={track.title} className="w-full h-full object-cover" loading="lazy" decoding="async" width={80} height={80} />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-1">
              <p className="text-xs text-muted-foreground">
                {formatDate(track.created_at)}
              </p>
              {displayedVersion?.duration && (
                <p className="text-xs text-muted-foreground">
                  ⏱️ {formatDuration(displayedVersion.duration)}
                </p>
              )}
              {track.style_tags && track.style_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {track.style_tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions - Single Row */}
          <div className="grid grid-cols-4 gap-1">
            <Button size="sm" variant="outline" onClick={handlePlay} disabled={!displayedVersion?.audio_url} className="min-h-[44px]" aria-label={isPlaying ? "Пауза" : "Воспроизвести"}>
              <Play className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleLikeClick} className="min-h-[44px]" aria-live="polite" aria-pressed={isLiked} aria-label={isLiked ? "Убрать лайк c активной версии" : "Поставить лайк активной версии"}>
              <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current text-red-500")} />
            </Button>
            <Button size="sm" variant="outline" onClick={handleDownload} disabled={!displayedVersion?.audio_url} className="min-h-[44px]" aria-label="Скачать активную версию">
              <Download className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={handleShare} className="min-h-[44px]" aria-label="Поделиться треком">
              <Share2 className="h-3.5 w-3.5" />
            </Button>
          </div>

          <Separator />

          {/* Accordion Sections */}
          <Accordion 
            type="single" 
            collapsible 
            value={activeAccordion} 
            onValueChange={setActiveAccordion}
            className="space-y-2"
          >
            {/* Info & Settings */}
            <AccordionItem value="info" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  <span className="text-sm font-medium">Информация</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="space-y-2.5 pb-3">
                <div className="space-y-1.5">
                  <Label htmlFor="title" className="text-xs">Название</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>

                {/* Жанр и настроение */}
                {(track.genre || track.mood) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Жанр и настроение</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {track.genre && (
                        <Badge variant="default" className="text-[10px] h-5 px-2">
                          🎵 {track.genre}
                        </Badge>
                      )}
                      {track.mood && (
                        <Badge variant="outline" className="text-[10px] h-5 px-2">
                          😊 {track.mood}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}

                {/* Теги из информации генерации */}
                {track.style_tags && track.style_tags.length > 0 && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Стиль-теги</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {track.style_tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Статистика */}
                {(track.play_count || track.like_count || track.download_count || track.view_count) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Статистика</Label>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {track.play_count !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">▶️ Прослушивания:</span>
                          <span className="font-medium">{track.play_count}</span>
                        </div>
                      )}
                      {track.like_count !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">❤️ Лайки:</span>
                          <span className="font-medium">{track.like_count}</span>
                        </div>
                      )}
                      {track.download_count !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">⬇️ Загрузки:</span>
                          <span className="font-medium">{track.download_count}</span>
                        </div>
                      )}
                      {track.view_count !== undefined && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">👁️ Просмотры:</span>
                          <span className="font-medium">{track.view_count}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Провайдер и модель */}
                {(track.provider || track.model_name) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Технические данные</Label>
                    <div className="text-xs space-y-1">
                      {track.provider && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Провайдер:</span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {track.provider === 'suno' ? '🎼 Suno AI' : track.provider === 'mureka' ? '🎹 Mureka AI' : track.provider}
                          </Badge>
                        </div>
                      )}
                      {track.model_name && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Модель:</span>
                          <span className="font-mono text-[10px]">{track.model_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Анализ из metadata */}
                {track.metadata && (track.metadata.tempo_bpm || track.metadata.key || (track.metadata.instruments && track.metadata.instruments.length > 0)) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Музыкальный анализ</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {track.metadata.tempo_bpm && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-2">
                          🥁 {track.metadata.tempo_bpm} BPM
                        </Badge>
                      )}
                      {track.metadata.key && (
                        <Badge variant="secondary" className="text-[10px] h-5 px-2">
                          🎹 {track.metadata.key}
                        </Badge>
                      )}
                      {track.metadata.instruments && track.metadata.instruments.map((instrument) => (
                        <Badge key={instrument} variant="outline" className="text-[10px] h-5 px-2">
                          🎸 {instrument}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Лирика */}
                {track.lyrics && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      Лирика
                    </Label>
                    <StructuredLyricsViewer lyrics={track.lyrics} compact />
                  </div>
                )}

                {/* AI-описание из metadata */}
                {track.metadata?.ai_description && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" />
                      AI-описание
                    </Label>
                    <div className="bg-secondary/30 rounded-lg p-3 text-[11px] leading-relaxed text-muted-foreground max-h-32 overflow-y-auto">
                      {track.metadata.ai_description}
                    </div>
                  </div>
                )}

                {/* Референсное аудио */}
                {track.reference_audio_url && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5" />
                      Референсное аудио
                    </Label>
                    <audio 
                      controls 
                      src={track.reference_audio_url} 
                      className="w-full h-8 rounded"
                      style={{ height: '32px' }}
                      preload="metadata"
                    />
                  </div>
                )}

                {/* Музыкальная персона */}
                {(track.metadata?.personaId || track.metadata?.personaName) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Музыкальная персона
                    </Label>
                    <div className="bg-secondary/30 rounded-lg p-2.5">
                      <p className="text-xs font-medium">{track.metadata.personaName || 'Персона'}</p>
                      {track.metadata.personaId && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">ID: {track.metadata.personaId}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Проект */}
                {(track.metadata?.activeProjectId || track.metadata?.inspoProjectId) && (
                  <div className="space-y-1.5">
                    <Label className="text-xs flex items-center gap-1.5">
                      <Folder className="w-3.5 h-3.5" />
                      Проект
                    </Label>
                    <div className="bg-secondary/30 rounded-lg p-2.5 space-y-2">
                      {track.metadata.activeProjectId && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Активный проект</p>
                          <p className="text-xs font-medium">{track.metadata.activeProjectName || track.metadata.activeProjectId}</p>
                        </div>
                      )}
                      {track.metadata.inspoProjectId && (
                        <div>
                          <p className="text-[10px] text-muted-foreground">Проект-вдохновение</p>
                          <p className="text-xs font-medium">{track.metadata.inspoProjectName || track.metadata.inspoProjectId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="public" className="text-xs">Публичный доступ</Label>
                  <Switch id="public" checked={isPublic} onCheckedChange={setIsPublic} />
                </div>

                {/* Промпт */}
                {track.prompt && (
                  <details className="rounded border bg-muted/30">
                    <summary className="text-xs px-2 py-1.5 cursor-pointer select-none">💬 Промпт генерации</summary>
                    <div className="px-2 pb-2">
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded max-h-24 overflow-y-auto">
                        {track.prompt}
                      </p>
                    </div>
                  </details>
                )}

                {/* Улучшенный промпт */}
                {track.improved_prompt && (
                  <details className="rounded border bg-muted/30">
                    <summary className="text-xs px-2 py-1.5 cursor-pointer select-none">✨ Улучшенный промпт</summary>
                    <div className="px-2 pb-2">
                      <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded max-h-24 overflow-y-auto">
                        {track.improved_prompt}
                      </p>
                    </div>
                  </details>
                )}


                {/* Save button is moved to the sticky footer */}
              </AccordionContent>
            </AccordionItem>

            {/* Versions */}
            <AccordionItem value="versions" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Music className="h-4 w-4" />
                  <span className="text-sm font-medium">Версии</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <div role="tablist" aria-label="Список вариантов трека" className="flex flex-wrap gap-1.5">
                  {allVersions?.map((v, idx) => {
                    const isActive = v.id === displayedVersion?.id;
                    return (
                      <button
                        key={v.id}
                        role="tab"
                        aria-selected={isActive}
                        tabIndex={isActive ? 0 : -1}
                        className={cn(
                          "px-2.5 h-7 rounded-full text-xs border",
                          isActive ? "bg-primary text-primary-foreground border-primary" : "bg-muted hover:bg-muted/60"
                        )}
                        onClick={() => handleVersionChange(idx)}
                        onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleVersionChange(idx);
                          }
                        }}
                        aria-label={`Вариант ${v.versionNumber ?? (idx + 1)}${v.isMasterVersion ? ' — основной' : ''}`}
                        title={`Вариант ${v.versionNumber ?? (idx + 1)}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {v.isMasterVersion && <Star className="w-3 h-3" />}
                          {`V${v.versionNumber ?? (idx + 1)}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Stems */}
            {track.has_stems && (
              <AccordionItem value="stems" className="border rounded-lg px-3">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    <span className="text-sm font-medium">Стемы</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <MinimalStemsList trackId={track.id} />
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Lyrics */}
          </Accordion>

          {/* Контекстное меню активной версии */}
          <div className="mt-2" onClick={(e) => e.stopPropagation()}>
            <UnifiedTrackActionsMenu
              trackId={track.id}
              trackStatus={track.status}
              trackMetadata={{ provider: 'suno' }}
              currentVersionId={operationTargetId}
              versionNumber={displayedVersion?.versionNumber}
              isMasterVersion={displayedVersion?.isMasterVersion}
              variant="full"
              showQuickActions={true}
              layout="flat"
              isLiked={isLiked}
              hasVocals={track.has_stems ?? false}
              onLike={handleLikeClick}
              onDownload={() => handleDownload()}
              onShare={() => handleShare()}
            />
          </div>
        </div>
      </ScrollArea>

      {/* Sticky Footer */}
      <div className="p-3 border-t bg-card/50 shrink-0 space-y-2">
        <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-full min-h-[44px]">
          {isSaving ? "Сохранение..." : "Сохранить"}
        </Button>
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="w-full min-h-[44px]"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Удалить трек
          </Button>
        )}
      </div>
    </div>
  );
});

MinimalDetailPanel.displayName = "MinimalDetailPanel";
