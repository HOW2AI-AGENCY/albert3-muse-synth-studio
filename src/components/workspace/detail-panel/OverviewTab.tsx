import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Heart, Calendar, Clock, ExternalLink, FileText } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StyleRecommendationsPanel } from "../StyleRecommendationsPanel";
import { ReferenceSourcesPanel } from "../ReferenceSourcesPanel";
import { AIErrorAlert } from "@/components/ai-recommendations";
import { useAdvancedPromptGenerator } from "@/hooks/useAdvancedPromptGenerator";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { useRateLimitHandler } from "@/hooks/useRateLimitHandler";
import type { LucideIcon } from "@/utils/iconImports";
import type { Track } from "./types";

const formatDate = (date?: string) => {
    if (!date) return "—";
    try {
      return new Date(date).toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    } catch (error) {
      return "—";
    }
};

const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

interface OverviewTabProps {
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
    onSave: () => void;
    createdAtToDisplay?: string;
    durationToDisplay?: number;
}

export const OverviewTab = ({
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
    onSave,
    createdAtToDisplay,
    durationToDisplay
}: OverviewTabProps) => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isRateLimited, remainingTime, handleRateLimit, clearRateLimit } = useRateLimitHandler();
    const [aiError, setAiError] = useState<{ status?: number; message: string } | null>(null);

    const handleTagsApply = async (tags: string[]) => {
        if (!tags.length) return;

        const previousTags = track.style_tags || [];
        const uniqueTags = Array.from(new Set([...previousTags, ...tags]));

        queryClient.setQueryData(['track', track.id], (old: any) => ({
          ...old,
          style_tags: uniqueTags
        }));

        const { error } = await supabase
          .from('tracks')
          .update({ style_tags: uniqueTags })
          .eq('id', track.id);

        if (!error) {
          toast({
            title: `Добавлено ${tags.length} тегов`,
            description: tags.slice(0, 3).join(', ') + (tags.length > 3 ? '...' : ''),
            duration: 5000,
          });
          queryClient.invalidateQueries({ queryKey: ['track', track.id] });
        } else {
          queryClient.setQueryData(['track', track.id], (old: any) => ({
            ...old,
            style_tags: previousTags
          }));

          toast({
            title: "Ошибка",
            description: "Не удалось применить теги",
            variant: "destructive",
          });
        }
    };

    const { mutate: generateAdvanced, isPending: isGeneratingPrompt } = useAdvancedPromptGenerator({
        onSuccess: () => {
          setAiError(null);
          clearRateLimit();
        },
        onError: (error) => {
          const errorMessage = error.message;
          let status: number | undefined;
          if (errorMessage.includes('429')) {
            status = 429;
            handleRateLimit(60);
          } else if (errorMessage.includes('402')) {
            status = 402;
          } else if (errorMessage.includes('500') || errorMessage.includes('503')) {
            status = 500;
          }

          setAiError({
            status,
            message: errorMessage,
          });

          if (status === 500 || status === 503) {
            toast({
              title: "Используется упрощенное улучшение",
              description: "AI сервис недоступен, применен базовый enhancer",
              variant: "default",
            });
          }
        }
    });

    return (
        <>
            <Card className="bg-[var(--card-primary-bg)] border-[var(--card-primary-border)] shadow-[var(--card-primary-shadow)]">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base">Метаданные</CardTitle>
                <CardDescription className="text-xs">Обновите ключевую информацию и видимость трека.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Название трека" className="h-10 text-sm" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input id="genre" value={genre} onChange={e => setGenre(e.target.value)} placeholder="Жанр" className="h-10 text-sm" />
                  <Input id="mood" value={mood} onChange={e => setMood(e.target.value)} placeholder="Настроение" className="h-10 text-sm" />
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

            <Card className="bg-[var(--card-secondary-bg)] border-[var(--card-secondary-border)] shadow-[var(--card-secondary-shadow)]">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base">Статистика</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 grid gap-2 sm:grid-cols-2">
                <StatsItem icon={Eye} label="Просмотры" value={`${track.view_count || 0}`} />
                <StatsItem icon={Heart} label="Лайки" value={`${track.like_count || 0}`} />
                <StatsItem icon={Calendar} label="Создан" value={formatDate(createdAtToDisplay)} />
                <StatsItem icon={Clock} label="Длительность" value={formatDuration(durationToDisplay)} />
              </CardContent>
            </Card>

            <Card className="bg-[var(--card-secondary-bg)] border-[var(--card-secondary-border)] shadow-[var(--card-secondary-shadow)]">
              <CardHeader className="pb-2 px-4 pt-4">
                <CardTitle className="text-base">AI рекомендации по стилю</CardTitle>
                <CardDescription className="text-xs">Подберите подходящие жанры и теги с помощью ассистента.</CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-3">
                {aiError && (
                  <AIErrorAlert
                    error={aiError}
                    remainingTime={remainingTime}
                    onRetry={() => {
                      setAiError(null);
                      clearRateLimit();
                    }}
                    onNavigateToUsage={() => navigate('/settings/usage')}
                  />
                )}

                <StyleRecommendationsPanel
                  mood={mood}
                  genre={genre}
                  context={track.prompt}
                  currentTags={track.style_tags ?? []}
                  onApplyTags={handleTagsApply}
                  onGenerateAdvancedPrompt={(request) => generateAdvanced(request)}
                  isGeneratingPrompt={isGeneratingPrompt || isRateLimited}
                  currentPrompt={track.prompt}
                  currentLyrics={track.lyrics || undefined}
                />
              </CardContent>
            </Card>

            <ReferenceSourcesPanel
              metadata={track.metadata ?? null}
              trackId={track.id}
              className="mb-4"
            />

            <Card className="bg-muted/30 border-border/40">
              <CardHeader className="pb-2 px-4 pt-3">
                <CardTitle className="text-sm font-medium">Технические детали</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Модель:</span>
                  <span className="font-medium">{track.model_name || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Suno ID:</span>
                  <span className="font-mono text-[10px]">{track.suno_id || "—"}</span>
                </div>
                {track.video_url && <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Видео:</span>
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => window.open(track.video_url || '', "_blank")}>
                      Открыть
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </Button>
                  </div>}
              </CardContent>
            </Card>

            {track.lyrics && <Card className="bg-muted/20 border-border/30">
                <CardContent className="px-3 py-3">
                  <div className="flex items-start gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <pre className="text-xs leading-relaxed text-foreground/90 whitespace-pre-wrap font-sans overflow-x-auto">
                      {track.lyrics}
                    </pre>
                  </div>
                </CardContent>
              </Card>}

            {track.prompt && <Card className="bg-muted/20 border-border/30">
                <CardContent className="px-3 py-3">
                  <pre className="text-xs bg-muted/30 p-2 rounded whitespace-pre-wrap font-mono">
                    {track.prompt}
                  </pre>
                </CardContent>
              </Card>}
        </>
    );
};
