import { memo, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, X, Loader2, Music, Mic, Trash2 } from '@/utils/iconImports';
import { cn } from '@/lib/utils';
import { ReferenceTrackSelector } from './ReferenceTrackSelector';
import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { ReferenceAnalysisCard } from './ReferenceAnalysisCard';
import { useReferenceAnalysis } from '@/hooks/useReferenceAnalysis';
import { logger } from '@/utils/logger';

interface AudioReferenceSectionProps {
  referenceFileName: string | null;
  referenceAudioUrl?: string | null;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onSelectTrack?: (track: { id: string; audio_url: string; title: string }) => void;
  onRecordComplete?: (url: string) => void;
  isUploading: boolean;
  isGenerating: boolean;
  /** ✅ НОВОЕ: Автоматически запускать анализ при загрузке */
  autoAnalyze?: boolean;
  /** ✅ НОВОЕ: Callback при завершении анализа */
  onAnalysisComplete?: (result: {
    recognition: any;
    description: any;
    murekaFileId?: string;
  }) => void;
}

export const AudioReferenceSection = memo(({
  referenceFileName,
  referenceAudioUrl,
  onFileSelect,
  onRemove,
  onSelectTrack,
  onRecordComplete,
  isUploading,
  isGenerating,
  autoAnalyze = false,
  onAnalysisComplete,
}: AudioReferenceSectionProps) => {
  const [trackSelectorOpen, setTrackSelectorOpen] = useState(false);

  // ✅ НОВОЕ: Интеграция с Mureka Analysis
  const {
    analyzeAudio,
    isAnalyzing,
    recognition,
    description,
    isPolling,
  } = useReferenceAnalysis();

  const handleTrackSelect = (track: { id: string; audio_url: string; title: string }) => {
    onSelectTrack?.(track);
    setTrackSelectorOpen(false);
  };

  // ✅ FIX: Автоматический анализ при изменении referenceAudioUrl
  useEffect(() => {
    if (!autoAnalyze || !referenceAudioUrl) return;
    
    // Проверяем, не запущен ли уже анализ для этого URL
    const isAlreadyAnalyzed = (
      recognition?.audio_file_url === referenceAudioUrl && 
      recognition.status === 'completed'
    ) || (
      description?.audio_file_url === referenceAudioUrl && 
      description.status === 'completed'
    );

    if (isAlreadyAnalyzed || isAnalyzing || isPolling) {
      return; // Не запускаем повторно
    }

    logger.info('🔍 [AUTO-ANALYSIS] Starting analysis', 'AudioReferenceSection', {
      audioUrl: referenceAudioUrl.substring(0, 50)
    });

    analyzeAudio({ audioUrl: referenceAudioUrl })
      .catch(error => {
        logger.error('[AUTO-ANALYSIS] Failed', error, 'AudioReferenceSection');
      });
  }, [
    autoAnalyze, 
    referenceAudioUrl,
    isAnalyzing,
    isPolling,
    analyzeAudio
    // ✅ НЕ добавляем recognition/description в зависимости!
  ]);

  // ✅ НОВОЕ: Уведомление родителя о завершении анализа
  useEffect(() => {
    if (
      onAnalysisComplete &&
      (recognition?.status === 'completed' || description?.status === 'completed')
    ) {
      onAnalysisComplete({
        recognition,
        description,
      });
    }
  }, [recognition?.status, description?.status, onAnalysisComplete]);

  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium">Референсное аудио</Label>
      
      {referenceFileName ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 p-2 rounded-md bg-secondary/30 border border-border/20">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{referenceFileName}</p>
              <p className="text-[10px] text-muted-foreground">Аудио загружено</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={onRemove}
              disabled={isGenerating}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
          
          {/* Audio preview */}
          {referenceAudioUrl && (
            <audio controls src={referenceAudioUrl} className="w-full h-8" />
          )}

          {/* ✅ НОВОЕ: AI Analysis Results */}
          {referenceAudioUrl && (
            <ReferenceAnalysisCard
              recognition={recognition || null}
              description={description || null}
              isAnalyzing={isAnalyzing}
              isPolling={isPolling}
              onApplyTitle={(title, artist) => {
                onAnalysisComplete?.({
                  recognition: { 
                    recognized_title: title, 
                    recognized_artist: artist,
                    status: 'completed'
                  } as any,
                  description: null,
                });
              }}
              onApplyCharacteristics={(chars) => {
                onAnalysisComplete?.({
                  recognition: null,
                  description: {
                    detected_genre: chars.genre,
                    detected_mood: chars.mood,
                    tempo_bpm: chars.tempo,
                    detected_instruments: chars.instruments,
                    ai_description: chars.description,
                    status: 'completed'
                  } as any,
                });
              }}
              onApplyAll={() => {
                onAnalysisComplete?.({
                  recognition,
                  description,
                });
              }}
              className="mt-2"
            />
          )}
        </div>
      ) : (
        <Tabs defaultValue="upload" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-8">
            <TabsTrigger value="track" className="text-xs">
              <Music className="h-3 w-3 mr-1" />
              Библиотека
            </TabsTrigger>
            <TabsTrigger value="upload" className="text-xs">
              <Upload className="h-3 w-3 mr-1" />
              Загрузить
            </TabsTrigger>
            <TabsTrigger value="record" className="text-xs">
              <Mic className="h-3 w-3 mr-1" />
              Записать
            </TabsTrigger>
          </TabsList>

          <TabsContent value="track" className="mt-2">
            <Button
              variant="outline"
              className="w-full h-16 border-dashed"
              onClick={() => setTrackSelectorOpen(true)}
              disabled={isGenerating}
            >
              <Music className="h-5 w-5 mr-2" />
              <div className="text-left">
                <div className="text-xs font-medium">Выбрать из библиотеки</div>
                <div className="text-[10px] text-muted-foreground">Ваши готовые треки</div>
              </div>
            </Button>
          </TabsContent>

          <TabsContent value="upload" className="mt-2">
            <div className="relative">
              <input
                id="audio-upload"
                type="file"
                accept="audio/*"
                onChange={onFileSelect}
                disabled={isUploading || isGenerating}
                className="sr-only"
              />
              <Label
                htmlFor="audio-upload"
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 p-3 rounded-md border-2 border-dashed cursor-pointer transition-colors",
                  "hover:bg-secondary/20 hover:border-primary/30",
                  (isUploading || isGenerating) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span className="text-xs text-muted-foreground">Загрузка...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs font-medium">Загрузить аудио</span>
                    <span className="text-[10px] text-muted-foreground">MP3, WAV, OGG до 20MB</span>
                  </>
                )}
              </Label>
            </div>
          </TabsContent>

          <TabsContent value="record" className="mt-2">
            {referenceFileName && referenceAudioUrl ? (
              <div className="space-y-2 p-3 rounded-md border border-border/40 bg-secondary/10">
                <div className="flex items-center gap-2 p-2 bg-success/10 rounded border border-success/20">
                  <div className="flex-1">
                    <p className="text-xs font-medium text-success">✓ Аудио записано и загружено</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Готово к использованию</p>
                  </div>
                </div>
                <audio controls src={referenceAudioUrl} className="w-full h-8" />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={onRemove} 
                  className="w-full text-xs"
                  disabled={isGenerating}
                >
                  <Trash2 className="h-3 w-3 mr-2" />
                  Удалить и записать заново
                </Button>
              </div>
            ) : (
              <AudioRecorder
                onRecordComplete={(url) => onRecordComplete?.(url)}
                onRemove={onRemove}
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Track Selector Dialog */}
      <ReferenceTrackSelector
        open={trackSelectorOpen}
        onClose={() => setTrackSelectorOpen(false)}
        onSelect={handleTrackSelect}
      />
    </div>
  );
});

AudioReferenceSection.displayName = 'AudioReferenceSection';
