import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Music4, ChevronDown, ChevronUp, Play, Pause, Download, List, Sliders } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { ApiService } from "@/services/api.service";
import { StemMixerProvider } from "@/contexts/StemMixerContext";
import { AdvancedStemMixer } from "./AdvancedStemMixer";

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  suno_task_id?: string;
}

interface TrackStemsPanelProps {
  trackId: string;
  versionId?: string;
  stems: TrackStem[];
  onStemsGenerated?: () => void;
}

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

const stemTypeOrder: Record<string, number> = {
  vocals: 0,
  backing_vocals: 1,
  instrumental: 2,
  original: 3,
  drums: 10,
  bass: 20,
  guitar: 30,
  keyboard: 40,
  percussion: 50,
  strings: 60,
  brass: 70,
  woodwinds: 80,
  synth: 90,
  fx: 100,
};

const sortStems = (collection: TrackStem[]) => {
  return [...collection].sort((a, b) => {
    const orderA = stemTypeOrder[a.stem_type] ?? 999;
    const orderB = stemTypeOrder[b.stem_type] ?? 999;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.stem_type.localeCompare(b.stem_type);
  });
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

export const TrackStemsPanel = ({ trackId, versionId, stems, onStemsGenerated }: TrackStemsPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [viewMode, setViewMode] = useState<'simple' | 'mixer'>('simple');
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();

  const handleGenerateStems = async (mode: 'separate_vocal' | 'split_stem') => {
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let abortTimeout: ReturnType<typeof setTimeout> | null = null;
    let syncInterval: ReturnType<typeof setInterval> | null = null;
    let syncStartTimeout: ReturnType<typeof setTimeout> | null = null;
    let syncInFlight = false;

    const clearTimers = () => {
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
      if (abortTimeout) {
        clearTimeout(abortTimeout);
        abortTimeout = null;
      }
      if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
      }
      if (syncStartTimeout) {
        clearTimeout(syncStartTimeout);
        syncStartTimeout = null;
      }
      syncInFlight = false;
    };

    try {
      setIsGenerating(true);

      const requestBody: Record<string, unknown> = {
        trackId,
        separationMode: mode,
      };

      if (versionId) {
        requestBody.versionId = versionId;
      }

      const { data: response, error } = await supabase.functions.invoke<{
        success?: boolean;
        taskId?: string;
        error?: string;
      }>('separate-stems', {
        body: requestBody,
      });

      if (error) {
        throw new Error(error.message ?? 'Не удалось запустить разделение стемов');
      }

      if (response?.error) {
        throw new Error(response.error);
      }

      const targetTaskId = response?.taskId;

      if (!response?.success || !targetTaskId) {
        throw new Error('Сервис не вернул идентификатор задачи разделения стемов');
      }

      toast.success(
        mode === 'separate_vocal'
          ? 'Запущено разделение на вокал и инструментал'
          : 'Запущено инструментальное разделение трека'
      );

      pollInterval = setInterval(async () => {
        const { data: stemsData, error: stemsError } = await supabase
          .from('track_stems')
          .select('*')
          .eq('track_id', trackId);

        if (stemsError) {
          console.error('Error polling stems:', stemsError);
          return;
        }

        const matchingStems = stemsData?.filter(stem => stem.suno_task_id === targetTaskId);

        if (matchingStems && matchingStems.length > 0) {
          clearTimers();
          onStemsGenerated?.();
          toast.success('Стемы успешно созданы!');
          setIsGenerating(false);
        }
      }, 5000);

      const attemptSync = async () => {
        if (syncInFlight) {
          return;
        }
        syncInFlight = true;
        try {
          await ApiService.syncStemJob({
            trackId,
            versionId,
            taskId: targetTaskId,
            separationMode: mode,
          });
        } catch (syncError) {
          console.error('Error synchronising stem job:', syncError);
        } finally {
          syncInFlight = false;
        }
      };

      syncStartTimeout = setTimeout(() => {
        void attemptSync();
        syncInterval = setInterval(() => {
          void attemptSync();
        }, 60000);
      }, 45000);

      abortTimeout = setTimeout(() => {
        clearTimers();
        setIsGenerating(false);
        toast.error('Не удалось получить новые стемы. Попробуйте еще раз через несколько минут.');
      }, 300000);

    } catch (error) {
      clearTimers();
      const message = error instanceof Error ? error.message : 'Ошибка при создании стемов';
      console.error('Error generating stems:', error);
      toast.error(message);
      setIsGenerating(false);
    }
  };

  const handlePlayStem = (stem: TrackStem) => {
    const stemKey = `stem-${stem.id}`;
    const isCurrentStem = currentTrack?.id === stemKey;

    if (isCurrentStem && isPlaying) {
      togglePlayPause();
    } else {
      playTrack({
        id: stemKey,
        title: formatStemLabel(stem.stem_type),
        audio_url: stem.audio_url,
      });
    }
  };

  const handleDownloadStem = (stem: TrackStem) => {
    window.open(stem.audio_url, '_blank');
  };

  const twoStemCollection = sortStems(stems.filter(s => s.separation_mode === 'separate_vocal'));
  const multiStemCollection = sortStems(stems.filter(s => s.separation_mode === 'split_stem'));

  const hasTwoStemMode = twoStemCollection.length > 0;
  const hasMultiStemMode = multiStemCollection.length > 0;

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music4 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Стемы</h3>
          {stems.length > 0 && (
            <Badge variant="secondary">{stems.length}</Badge>
          )}
        </div>
        {stems.length > 0 && (
          <div className="flex items-center gap-2">
            <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as 'simple' | 'mixer')}>
              <ToggleGroupItem value="simple" aria-label="Простой режим">
                <List className="w-4 h-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="mixer" aria-label="Режим микшера">
                <Sliders className="w-4 h-4" />
              </ToggleGroupItem>
            </ToggleGroup>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}
      </div>

      {isGenerating && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground animate-pulse">
            ⏱️ Processing... This typically takes {stems.some(s => s.separation_mode === 'split_stem') || stems.length === 0 ? '60-180' : '30-90'} seconds
          </p>
          <p className="text-xs text-muted-foreground">
            Генерация стемов запущена. Мы обновим список автоматически, как только Suno пришлёт результат.
          </p>
        </div>
      )}

      {stems.length === 0 ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Разделите трек на отдельные элементы для более гибкой работы со звуком
          </p>
          <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
            <Button
              onClick={() => handleGenerateStems('separate_vocal')}
              disabled={isGenerating}
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
            >
              <span className="font-semibold">Вокал + Инструментал</span>
              <span className="text-xs text-muted-foreground">2 стема</span>
            </Button>
            <Button
              onClick={() => handleGenerateStems('split_stem')}
              disabled={isGenerating}
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
            >
              <span className="font-semibold">По инструментам</span>
              <span className="text-xs text-muted-foreground">До 8 стемов</span>
            </Button>
          </div>
          {isGenerating && (
            <p className="text-xs text-muted-foreground animate-pulse">
              Обработка может занять до пары минут. Оставьте окно открытым — мы пришлём уведомление, когда стемы будут готовы.
            </p>
          )}
        </div>
      ) : (
        <>
          {isExpanded && viewMode === 'simple' && (
            <div className="space-y-4">
              {hasTwoStemMode && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Базовое разделение
                  </div>
                  {twoStemCollection.map(stem => {
                      const stemKey = `stem-${stem.id}`;
                      const isCurrentStem = currentTrack?.id === stemKey;
                      const isStemPlaying = isCurrentStem && isPlaying;

                      return (
                        <div key={stem.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                          <Button
                            size="icon"
                            variant={isStemPlaying ? "default" : "ghost"}
                            className="shrink-0 h-11 w-11 sm:h-9 sm:w-9 touch-action-manipulation"
                            onClick={() => handlePlayStem(stem)}
                          >
                            {isStemPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="flex-1 text-sm font-medium">
                            {formatStemLabel(stem.stem_type)}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 h-11 w-11 sm:h-9 sm:w-9 touch-action-manipulation"
                            onClick={() => handleDownloadStem(stem)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}

              {hasMultiStemMode && hasTwoStemMode && (
                <Separator className="my-3" />
              )}

              {hasMultiStemMode && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Детальное разделение
                  </div>
                  {multiStemCollection.map(stem => {
                      const stemKey = `stem-${stem.id}`;
                      const isCurrentStem = currentTrack?.id === stemKey;
                      const isStemPlaying = isCurrentStem && isPlaying;

                      return (
                        <div key={stem.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors">
                          <Button
                            size="icon"
                            variant={isStemPlaying ? "default" : "ghost"}
                            className="shrink-0 h-11 w-11 sm:h-9 sm:w-9 touch-action-manipulation"
                            onClick={() => handlePlayStem(stem)}
                          >
                            {isStemPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="flex-1 text-sm font-medium">
                            {formatStemLabel(stem.stem_type)}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="shrink-0 h-11 w-11 sm:h-9 sm:w-9 touch-action-manipulation"
                            onClick={() => handleDownloadStem(stem)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}

          {isExpanded && viewMode === 'mixer' && (
            <StemMixerProvider>
              <AdvancedStemMixer stems={stems} />
            </StemMixerProvider>
          )}

          {!hasTwoStemMode && (
            <div className="mt-3">
              <Button
                onClick={() => handleGenerateStems('separate_vocal')}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Добавить вокал + инструментал
              </Button>
            </div>
          )}

          {!hasMultiStemMode && (
            <div className="mt-2">
              <Button
                onClick={() => handleGenerateStems('split_stem')}
                disabled={isGenerating}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Добавить разделение по инструментам
              </Button>
            </div>
          )}
        </>
      )}
    </Card>
  );
};