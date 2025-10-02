import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Music4, ChevronDown, ChevronUp, Play, Pause, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
}

interface TrackStemsPanelProps {
  trackId: string;
  versionId?: string;
  stems: TrackStem[];
  onStemsGenerated?: () => void;
}

const stemTypeLabels: { [key: string]: string } = {
  vocals: "Вокал",
  instrumental: "Инструментал",
  drums: "Ударные",
  bass: "Бас",
  guitar: "Гитара",
  keyboard: "Клавишные",
  strings: "Струнные",
  brass: "Духовые (медные)",
  woodwinds: "Духовые (деревянные)",
  percussion: "Перкуссия",
  synth: "Синтезатор",
  fx: "Эффекты"
};

export const TrackStemsPanel = ({ trackId, versionId, stems, onStemsGenerated }: TrackStemsPanelProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const { currentTrack, isPlaying, playTrack, togglePlayPause } = useAudioPlayer();

  const handleGenerateStems = async (mode: 'separate_vocal' | 'split_stem') => {
    try {
      setIsGenerating(true);
      
      const { data, error } = await supabase.functions.invoke('separate-stems', {
        body: {
          trackId,
          versionId,
          separationMode: mode
        }
      });

      if (error) throw error;

      toast.success(
        mode === 'separate_vocal' 
          ? 'Начато разделение на вокал и инструментал' 
          : 'Начато разделение на инструменты'
      );
      
      // Poll for stems completion
      const pollInterval = setInterval(async () => {
        const { data: stemsData, error: stemsError } = await supabase
          .from('track_stems')
          .select('*')
          .eq('track_id', trackId);

        if (!stemsError && stemsData && stemsData.length > 0) {
          clearInterval(pollInterval);
          onStemsGenerated?.();
          toast.success('Стемы успешно созданы!');
          setIsGenerating(false);
        }
      }, 5000);

      // Stop polling after 5 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setIsGenerating(false);
      }, 300000);

    } catch (error) {
      console.error('Error generating stems:', error);
      toast.error('Ошибка при создании стемов');
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
        title: stemTypeLabels[stem.stem_type] || stem.stem_type,
        audio_url: stem.audio_url,
      });
    }
  };

  const handleDownloadStem = (stem: TrackStem) => {
    window.open(stem.audio_url, '_blank');
  };

  const hasTwoStemMode = stems.some(s => s.separation_mode === 'separate_vocal');
  const hasMultiStemMode = stems.some(s => s.separation_mode === 'split_stem');

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Music4 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Стемы</h3>
          {stems.length > 0 && (
            <Badge variant="secondary">{stems.length}</Badge>
          )}
        </div>
        {stems.length > 0 && (
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
        )}
      </div>

      {stems.length === 0 ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Разделите трек на отдельные элементы
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => handleGenerateStems('separate_vocal')}
              disabled={isGenerating}
              variant="outline"
              className="flex-1"
            >
              Вокал + Инструментал
            </Button>
            <Button
              onClick={() => handleGenerateStems('split_stem')}
              disabled={isGenerating}
              variant="outline"
              className="flex-1"
            >
              По инструментам
            </Button>
          </div>
        </div>
      ) : (
        <>
          {isExpanded && (
            <div className="space-y-2 mt-3">
              {hasTwoStemMode && (
                <>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Базовое разделение
                  </div>
                  {stems
                    .filter(s => s.separation_mode === 'separate_vocal')
                    .map(stem => {
                      const stemKey = `stem-${stem.id}`;
                      const isCurrentStem = currentTrack?.id === stemKey;
                      const isStemPlaying = isCurrentStem && isPlaying;

                      return (
                        <div key={stem.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/50">
                          <Button
                            size="icon"
                            variant={isStemPlaying ? "default" : "ghost"}
                            className="shrink-0"
                            onClick={() => handlePlayStem(stem)}
                          >
                            {isStemPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="flex-1 text-sm">
                            {stemTypeLabels[stem.stem_type] || stem.stem_type}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDownloadStem(stem)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                </>
              )}

              {hasMultiStemMode && hasTwoStemMode && (
                <Separator className="my-3" />
              )}

              {hasMultiStemMode && (
                <>
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    Детальное разделение
                  </div>
                  {stems
                    .filter(s => s.separation_mode === 'split_stem')
                    .map(stem => {
                      const stemKey = `stem-${stem.id}`;
                      const isCurrentStem = currentTrack?.id === stemKey;
                      const isStemPlaying = isCurrentStem && isPlaying;

                      return (
                        <div key={stem.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/50">
                          <Button
                            size="icon"
                            variant={isStemPlaying ? "default" : "ghost"}
                            className="shrink-0"
                            onClick={() => handlePlayStem(stem)}
                          >
                            {isStemPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4" />
                            )}
                          </Button>
                          <span className="flex-1 text-sm">
                            {stemTypeLabels[stem.stem_type] || stem.stem_type}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDownloadStem(stem)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                </>
              )}
            </div>
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