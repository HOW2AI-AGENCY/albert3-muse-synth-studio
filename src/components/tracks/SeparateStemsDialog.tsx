import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Music4, Loader2, Mic, Music, Download, FileAudio } from "@/utils/iconImports";
import { cn } from "@/lib/utils";
import { useStemSeparation } from "@/hooks/useStemSeparation";
import { supabase } from "@/integrations/supabase/client";
import { StemMixerProvider } from "@/contexts/StemMixerContext";
import { AdvancedStemMixer } from "@/features/tracks/components/AdvancedStemMixer";
import { useConvertToWav } from "@/hooks/useConvertToWav";
import { toast } from "sonner";

interface SeparateStemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle?: string;
  onSuccess?: () => void;
}

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  track_id: string;
  suno_task_id: string | null;
}

export const SeparateStemsDialog = ({
  open,
  onOpenChange,
  trackId,
  trackTitle,
  onSuccess,
}: SeparateStemsDialogProps) => {
  const [selectedMode, setSelectedMode] = useState<'separate_vocal' | 'split_stem' | null>(null);
  const [viewMode, setViewMode] = useState<'separate_vocal' | 'split_stem' | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [allStems, setAllStems] = useState<TrackStem[]>([]);
  const [vocalStems, setVocalStems] = useState<TrackStem[]>([]);
  const [splitStems, setSplitStems] = useState<TrackStem[]>([]);
  const [isLoadingStems, setIsLoadingStems] = useState(true);
  const { convertToWav, isConverting } = useConvertToWav();
  
  const { isGenerating, generateStems } = useStemSeparation({
    trackId,
    onSuccess: () => {
      onSuccess?.();
    },
    onStemsReady: () => {
      setShowResults(true);
    },
  });

  // Subscribe to stems updates
  useEffect(() => {
    if (!open || !trackId) return;

    const fetchStems = async () => {
      setIsLoadingStems(true);
      const { data } = await supabase
        .from('track_stems')
        .select('*')
        .eq('track_id', trackId);
      
      if (data) {
        const stems = data as TrackStem[];
        setAllStems(stems);
        
        // Разделяем стемы по типу разделения
        const vocal = stems.filter(s => s.separation_mode === 'separate_vocal');
        const split = stems.filter(s => s.separation_mode === 'split_stem');
        
        setVocalStems(vocal);
        setSplitStems(split);
      }
      setIsLoadingStems(false);
    };

    fetchStems();

    const channel = supabase
      .channel(`track_stems:${trackId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'track_stems',
          filter: `track_id=eq.${trackId}`,
        },
        () => {
          fetchStems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, trackId, isGenerating]);

  const handleGenerate = async (mode: 'separate_vocal' | 'split_stem') => {
    setSelectedMode(mode);
    setShowResults(false);
    setViewMode(null);
    await generateStems(mode);
    setSelectedMode(null);
  };

  const handleViewStems = (mode: 'separate_vocal' | 'split_stem') => {
    setViewMode(mode);
    setShowResults(true);
  };

  const handleBackToSelection = () => {
    setShowResults(false);
    setViewMode(null);
  };

  const handleDownloadAll = async () => {
    const stemsToDownload = viewMode === 'separate_vocal' ? vocalStems : 
                           viewMode === 'split_stem' ? splitStems : 
                           allStems;
    
    if (stemsToDownload.length === 0) return;
    
    toast.info(`Скачивание ${stemsToDownload.length} стемов...`);
    
    for (const stem of stemsToDownload) {
      try {
        const response = await fetch(stem.audio_url);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${trackTitle || 'track'}_${stem.stem_type}.mp3`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error(`Failed to download stem ${stem.stem_type}:`, error);
      }
    }
    
    toast.success('Все стемы скачаны');
  };

  const handleConvertAllToWav = async () => {
    const stemsToConvert = viewMode === 'separate_vocal' ? vocalStems : 
                          viewMode === 'split_stem' ? splitStems : 
                          allStems;
    
    if (stemsToConvert.length === 0) return;
    
    toast.info(`Конвертация ${stemsToConvert.length} стемов в WAV...`);
    
    for (const stem of stemsToConvert) {
      try {
        await convertToWav({
          trackId,
          audioId: stem.id,
        });
      } catch (error) {
        console.error(`Failed to convert stem ${stem.stem_type}:`, error);
      }
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setShowResults(false);
      setViewMode(null);
      setSelectedMode(null);
      onOpenChange(false);
    }
  };

  const currentStems = viewMode === 'separate_vocal' ? vocalStems : 
                      viewMode === 'split_stem' ? splitStems : 
                      allStems;
  
  const hasVocalStems = vocalStems.length > 0;
  const hasSplitStems = splitStems.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music4 className="w-5 h-5 text-primary" />
            {showResults 
              ? `Результаты: ${viewMode === 'separate_vocal' ? 'Вокал + Инструментал' : 'Детальное разделение'}` 
              : 'Разделение на стемы'}
          </DialogTitle>
          <DialogDescription>
            {trackTitle && <span className="font-medium">"{trackTitle}"</span>}
            {!showResults && (
              <>
                <br />
                Выберите режим разделения трека на отдельные элементы
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Initial Loading State */}
        {isLoadingStems && !isGenerating && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Загрузка...</p>
          </div>
        )}

        {/* Processing State */}
        {isGenerating && !showResults && (
          <div className="py-8 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
            <div className="space-y-2">
              <p className="font-medium">Обработка трека...</p>
              <p className="text-sm text-muted-foreground">
                Это может занять 30-180 секунд
              </p>
            </div>
          </div>
        )}

        {/* Results View */}
        {showResults && currentStems.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="text-sm text-muted-foreground">
                Найдено стемов: {currentStems.length}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadAll}
                  disabled={isConverting}
                >
                  <Download className="w-4 h-4 mr-1.5" />
                  Скачать все MP3
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleConvertAllToWav}
                  disabled={isConverting}
                >
                  <FileAudio className="w-4 h-4 mr-1.5" />
                  {isConverting ? 'Конвертация...' : 'Конвертировать все в WAV'}
                </Button>
              </div>
            </div>

            <StemMixerProvider>
              <AdvancedStemMixer stems={currentStems} trackTitle={trackTitle} />
            </StemMixerProvider>

            <div className="flex justify-between gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={handleBackToSelection}
                disabled={isGenerating}
              >
                Назад к выбору
              </Button>
              <Button variant="outline" onClick={handleClose} disabled={isGenerating}>
                Закрыть
              </Button>
            </div>
          </div>
        )}

        {/* Selection View */}
        {!isLoadingStems && !isGenerating && !showResults && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {/* Базовое разделение */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-primary/50 hover:shadow-glow-primary",
              selectedMode === 'separate_vocal' && "border-primary ring-2 ring-primary/20",
              hasVocalStems && "border-green-500/50 bg-green-500/5"
            )}
            onClick={() => !isGenerating && setSelectedMode('separate_vocal')}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2 justify-center">
                  Вокал + Инструментал
                  {hasVocalStems && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/50">
                      ✓ Готово
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Разделить на 2 стема: чистый вокал и инструментальная часть
                </p>
              </div>
              
              {hasVocalStems ? (
                <div className="w-full space-y-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewStems('separate_vocal');
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <Music className="w-4 h-4 mr-1.5" />
                    Просмотр ({vocalStems.length})
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerate('separate_vocal');
                    }}
                    disabled={isGenerating}
                    className="w-full"
                    variant="secondary"
                    size="sm"
                  >
                    Перегенерировать
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerate('separate_vocal');
                  }}
                  disabled={isGenerating}
                  className="w-full"
                  variant={selectedMode === 'separate_vocal' ? 'default' : 'outline'}
                >
                  {isGenerating && selectedMode === 'separate_vocal' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    'Разделить'
                  )}
                </Button>
              )}
            </div>
          </Card>

          {/* Детальное разделение */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-secondary/50 hover:shadow-glow-secondary",
              selectedMode === 'split_stem' && "border-secondary ring-2 ring-secondary/20",
              hasSplitStems && "border-green-500/50 bg-green-500/5"
            )}
            onClick={() => !isGenerating && setSelectedMode('split_stem')}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-secondary/10">
                <Music className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1 flex items-center gap-2 justify-center">
                  По инструментам
                  {hasSplitStems && (
                    <Badge variant="outline" className="text-xs bg-green-500/10 border-green-500/50">
                      ✓ Готово
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Разделить на 8+ стемов: вокал, ударные, бас, гитара и др.
                </p>
              </div>
              
              {hasSplitStems ? (
                <div className="w-full space-y-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewStems('split_stem');
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <Music className="w-4 h-4 mr-1.5" />
                    Просмотр ({splitStems.length})
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleGenerate('split_stem');
                    }}
                    disabled={isGenerating}
                    className="w-full"
                    variant="secondary"
                    size="sm"
                  >
                    Перегенерировать
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGenerate('split_stem');
                  }}
                  disabled={isGenerating}
                  className="w-full"
                  variant={selectedMode === 'split_stem' ? 'default' : 'outline'}
                >
                  {isGenerating && selectedMode === 'split_stem' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Генерация...
                    </>
                  ) : (
                    'Разделить'
                  )}
                </Button>
              )}
            </div>
          </Card>
            </div>

            <p className="text-xs text-muted-foreground text-center pt-2">
              💡 Процесс обычно занимает от 30 секунд до 3 минут
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
