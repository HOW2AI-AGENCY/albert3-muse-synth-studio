import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Music4, ChevronDown, ChevronUp, LayoutGrid, Sliders } from "@/utils/iconImports";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { StemMixerProvider } from "@/contexts/StemMixerContext";
import { AdvancedStemMixer } from "./AdvancedStemMixer";
import { useStemSeparation } from "@/hooks/useStemSeparation";
import { StemCard } from "./StemCard";
import { logInfo } from "@/utils/logger";

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  track_id: string;
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
  const [isExpanded, setIsExpanded] = useState(true); // Раскрыто по умолчанию
  const [viewMode, setViewMode] = useState<'grid' | 'mixer'>('grid');
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();

  const { isGenerating, generateStems: handleGenerateStems } = useStemSeparation({
    trackId,
    versionId,
    onStemsReady: () => {
      onStemsGenerated?.();
    },
  });

  // Улучшенная Realtime подписка
  useEffect(() => {
    logInfo(`Subscribing to stems for track ${trackId}`, 'TrackStemsPanel');
    
    const channel = supabase
      .channel(`track_stems_realtime_${trackId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'track_stems',
        filter: `track_id=eq.${trackId}`,
      }, (payload) => {
        logInfo('New stem inserted', 'TrackStemsPanel', { stem: payload.new });
        onStemsGenerated?.();
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'track_stems',
        filter: `track_id=eq.${trackId}`,
      }, (payload) => {
        logInfo('Stem updated', 'TrackStemsPanel', { stem: payload.new });
        onStemsGenerated?.();
      })
      .subscribe((status) => {
        logInfo(`Subscription status: ${status}`, 'TrackStemsPanel');
      });

    return () => {
      logInfo(`Unsubscribing from stems for track ${trackId}`, 'TrackStemsPanel');
      supabase.removeChannel(channel);
    };
  }, [trackId, onStemsGenerated]);

  const sortedStems = useMemo(() => sortStems(stems), [stems]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music4 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Стемы</h3>
          {stems.length > 0 && (
            <Badge variant="secondary" className="animate-in fade-in">
              {stems.length}
            </Badge>
          )}
        </div>

        {stems.length > 0 && (
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'grid' | 'mixer')}>
              <TabsList>
                <TabsTrigger value="grid">
                  <LayoutGrid className="w-4 h-4" />
                </TabsTrigger>
                <TabsTrigger value="mixer">
                  <Sliders className="w-4 h-4" />
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </Button>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isGenerating && (
        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <div>
              <p className="font-medium">Генерация стемов...</p>
              <p className="text-xs text-muted-foreground">
                Это может занять 30-180 секунд
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Empty state */}
      {stems.length === 0 && !isGenerating && (
        <Card className="p-6 text-center space-y-4">
          <div className="text-4xl">🎚️</div>
          <div>
            <h4 className="font-semibold mb-1">Стемы не созданы</h4>
            <p className="text-sm text-muted-foreground">
              Разделите трек на отдельные элементы
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => handleGenerateStems('separate_vocal')}
              disabled={isGenerating}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <span className="text-2xl">🎤</span>
              <div>
                <div className="font-semibold">Базовое</div>
                <div className="text-xs text-muted-foreground">2 стема</div>
              </div>
            </Button>

            <Button
              onClick={() => handleGenerateStems('split_stem')}
              disabled={isGenerating}
              variant="outline"
              className="h-auto py-4 flex-col gap-2"
            >
              <span className="text-2xl">🎛️</span>
              <div>
                <div className="font-semibold">Детальное</div>
                <div className="text-xs text-muted-foreground">До 8 стемов</div>
              </div>
            </Button>
          </div>
        </Card>
      )}

      {/* Stems Grid View */}
      {isExpanded && viewMode === 'grid' && stems.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {sortedStems.map((stem) => {
            const stemKey = `stem-${stem.id}`;
            const isCurrentStem = currentTrack?.id === stemKey;
            const isStemPlaying = isCurrentStem && isPlaying;

            return (
              <StemCard
                key={stem.id}
                stem={stem}
                isPlaying={isStemPlaying}
                onPlay={() => playTrack({
                  id: stemKey,
                  title: formatStemLabel(stem.stem_type),
                  audio_url: stem.audio_url,
                })}
                onPause={togglePlayPause}
                onDownload={() => window.open(stem.audio_url, '_blank')}
              />
            );
          })}
        </div>
      )}

      {/* Mixer View */}
      {isExpanded && viewMode === 'mixer' && stems.length > 0 && (
        <StemMixerProvider>
          <AdvancedStemMixer stems={sortedStems} />
        </StemMixerProvider>
      )}
    </div>
  );
};