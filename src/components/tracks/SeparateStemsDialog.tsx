import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music4, Loader2, Mic, Music, Download, FileAudio } from "@/utils/iconImports";
import { cn } from "@/lib/utils";
import { useStemSeparation } from "@/hooks/useStemSeparation";
import { supabase } from "@/integrations/supabase/client";
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
  const [showResults, setShowResults] = useState(false);
  const [stems, setStems] = useState<TrackStem[]>([]);
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
      const { data } = await supabase
        .from('track_stems')
        .select('*')
        .eq('track_id', trackId);
      
      if (data) {
        setStems(data as TrackStem[]);
        if (data.length > 0 && isGenerating) {
          setShowResults(true);
        }
      }
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
    setStems([]);
    await generateStems(mode);
    setSelectedMode(null);
  };

  const handleDownloadAll = async () => {
    if (stems.length === 0) return;
    
    toast.info(`Скачивание ${stems.length} стемов...`);
    
    for (const stem of stems) {
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
    if (stems.length === 0) return;
    
    toast.info(`Конвертация ${stems.length} стемов в WAV...`);
    
    for (const stem of stems) {
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
    setShowResults(false);
    setStems([]);
    setSelectedMode(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music4 className="w-5 h-5 text-primary" />
            {showResults ? 'Результаты разделения' : 'Разделение на стемы'}
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

        {/* Loading State */}
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
        {showResults && stems.length > 0 && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Найдено стемов: {stems.length}
              </p>
              <div className="flex gap-2">
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

            <AdvancedStemMixer stems={stems} trackTitle={trackTitle} />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={handleClose}>
                Закрыть
              </Button>
            </div>
          </div>
        )}

        {/* Selection View */}
        {!isGenerating && !showResults && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {/* Базовое разделение */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-primary/50 hover:shadow-glow-primary",
              selectedMode === 'separate_vocal' && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => !isGenerating && setSelectedMode('separate_vocal')}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Вокал + Инструментал</h3>
                <p className="text-xs text-muted-foreground">
                  Разделить на 2 стема: чистый вокал и инструментальная часть
                </p>
              </div>
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
            </div>
          </Card>

          {/* Детальное разделение */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-secondary/50 hover:shadow-glow-secondary",
              selectedMode === 'split_stem' && "border-secondary ring-2 ring-secondary/20"
            )}
            onClick={() => !isGenerating && setSelectedMode('split_stem')}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-secondary/10">
                <Music className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">По инструментам</h3>
                <p className="text-xs text-muted-foreground">
                  Разделить на 8+ стемов: вокал, ударные, бас, гитара и др.
                </p>
              </div>
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
