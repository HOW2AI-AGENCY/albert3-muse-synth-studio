import { memo, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useGenerateMusic } from '@/hooks/useGenerateMusic';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useBoostStyle } from '@/hooks/useBoostStyle';
import { AudioPreviewDialog } from '@/components/audio/AudioPreviewDialog';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';
import { MurekaLyricsVariantDialog } from '@/components/lyrics/MurekaLyricsVariantDialog';
import { PromptHistoryDialog } from '@/components/generator/PromptHistoryDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast as sonnerToast } from 'sonner';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { useProviderBalance } from '@/hooks/useProviderBalance';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import { getProviderModels, getDefaultModel, type MusicProvider as ProviderType } from '@/config/provider-models';

// New modular components
import { GeneratorHeader } from '@/components/generator/GeneratorHeader';
import { SimpleModeForm } from '@/components/generator/forms/SimpleModeForm';
import { CustomModeForm } from '@/components/generator/forms/CustomModeForm';
import type { GenerationParams, GeneratorMode, GenrePreset } from '@/components/generator/types/generator.types';

interface MusicGeneratorV2Props {
  onTrackGenerated?: () => void;
}

const MusicGeneratorV2Component = ({ onTrackGenerated }: MusicGeneratorV2Props) => {
  const { selectedProvider, setProvider } = useMusicGenerationStore();
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  
  const { generate, isGenerating } = useGenerateMusic({ 
    provider: selectedProvider as ProviderType, 
    onSuccess: onTrackGenerated,
    toast 
  });
  
  const currentModels = getProviderModels(selectedProvider as ProviderType);
  const { uploadAudio, isUploading } = useAudioUpload();
  const { boostStyle, isBoosting } = useBoostStyle();
  const { balance: sunoBalance } = useProviderBalance();
  const { savePrompt } = usePromptHistory();

  // UI State
  const [mode, setMode] = useState<GeneratorMode>('simple');
  const [audioPreviewOpen, setAudioPreviewOpen] = useState(false);
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [murekaLyricsDialog, setMurekaLyricsDialog] = useState({
    open: false,
    trackId: '',
    jobId: ''
  });
  
  // ✅ Check for pending stem reference on mount
  useEffect(() => {
    const pendingRef = localStorage.getItem('pendingStemReference');
    if (pendingRef) {
      try {
        const refData = JSON.parse(pendingRef);
        
        logger.info('🎯 [STEM-REF] Loading stem reference', 'MusicGeneratorV2', {
          stemType: refData.stemType,
          audioUrl: refData.audioUrl?.substring(0, 50),
          hasPrompt: !!refData.prompt,
          hasLyrics: !!refData.lyrics,
          hasTags: !!refData.styleTags,
        });
        
        // Переключаем на расширенную форму (custom mode)
        setMode('custom');
        
        // Переключаем на Suno если нужно (делаем это до setParams)
        if (selectedProvider === 'mureka') {
          setProvider('suno');
        }
        
        // Автозаполнение формы из референс-стема
        setParams(prev => {
          const newParams = {
            ...prev,
            prompt: refData.prompt || prev.prompt,
            lyrics: refData.lyrics || prev.lyrics,
            tags: refData.styleTags?.join(', ') || prev.tags,
            referenceAudioUrl: refData.audioUrl,
            referenceFileName: `${refData.stemType}.mp3`,
            referenceTrackId: refData.trackId,
            provider: 'suno', // Mureka не поддерживает референс
          };
          
          logger.info('✅ [STEM-REF] Params updated', 'MusicGeneratorV2', {
            hasReferenceAudioUrl: !!newParams.referenceAudioUrl,
            referenceFileName: newParams.referenceFileName,
            prompt: newParams.prompt?.substring(0, 50),
            tags: newParams.tags,
          });
          
          return newParams;
        });
        
        // Также обновляем debounced значения
        setDebouncedPrompt(refData.prompt || '');
        setDebouncedLyrics(refData.lyrics || '');
        
        // Очищаем после использования
        localStorage.removeItem('pendingStemReference');
        
        sonnerToast.success('Референс загружен', {
          description: `Стем "${refData.stemType}" установлен как основа для генерации`,
        });
        
      } catch (error) {
        logger.error('[STEM-REF] Failed to load stem reference', error as Error, 'MusicGeneratorV2');
        localStorage.removeItem('pendingStemReference');
        sonnerToast.error('Не удалось загрузить референс из стема');
      }
    }
  }, [selectedProvider, setProvider]);


  // Generation params
  const [params, setParams] = useState<GenerationParams>({
    prompt: '',
    title: '',
    lyrics: '',
    tags: '',
    negativeTags: '',
    vocalGender: 'any',
    modelVersion: selectedProvider === 'mureka' ? 'auto' : 'V5',
    referenceAudioUrl: null,
    referenceFileName: null,
    referenceTrackId: null,
    audioWeight: 50,
    styleWeight: 75,
    lyricsWeight: 70,
    weirdness: 10,
    provider: selectedProvider,
  });

  const setParam = useCallback(<K extends keyof GenerationParams>(key: K, value: GenerationParams[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Debounced state for textarea inputs
  const [debouncedPrompt, setDebouncedPrompt] = useState(params.prompt);
  const [debouncedLyrics, setDebouncedLyrics] = useState(params.lyrics);

  // Debounce effects
  useEffect(() => {
    const timer = setTimeout(() => setParam('prompt', debouncedPrompt), 300);
    return () => clearTimeout(timer);
  }, [debouncedPrompt, setParam]);

  useEffect(() => {
    const timer = setTimeout(() => setParam('lyrics', debouncedLyrics), 300);
    return () => clearTimeout(timer);
  }, [debouncedLyrics, setParam]);

  // ✅ NEW: Subscribe to track updates for Mureka lyrics selection
  useEffect(() => {
    if (!params.trackId) return;

    const channel = supabase
      .channel(`track_lyrics_${params.trackId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tracks',
          filter: `id=eq.${params.trackId}`,
        },
        (payload) => {
          const track = payload.new as any;
          if (
            track.metadata?.stage === 'lyrics_selection' && 
            track.metadata?.lyrics_job_id
          ) {
            logger.info('Mureka lyrics selection required', undefined, {
              trackId: track.id,
              jobId: track.metadata.lyrics_job_id
            });
            
            setMurekaLyricsDialog({
              open: true,
              trackId: track.id,
              jobId: track.metadata.lyrics_job_id
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [params.trackId]);

  // Sync provider with model version
  useEffect(() => {
    const defaultModel = getDefaultModel(selectedProvider as ProviderType);
    setParams(prev => {
      const newParams = { 
        ...prev, 
        provider: selectedProvider,
        modelVersion: defaultModel.value
      };
      
      // ✅ НОВОЕ: Очистить referenceAudioUrl если переключились на Mureka
      if (selectedProvider === 'mureka' && prev.referenceAudioUrl) {
        logger.warn('Clearing reference audio for Mureka', 'MusicGeneratorV2', {
          previousProvider: prev.provider,
          hadReference: !!prev.referenceAudioUrl
        });
        
        toast({
          title: '⚠️ Референс удалён',
          description: 'Mureka не поддерживает референсное аудио',
          duration: 4000,
        });
        
        return {
          ...newParams,
          referenceAudioUrl: null,
          referenceFileName: null,
          referenceTrackId: null,
        };
      }
      
      return newParams;
    });
  }, [selectedProvider, toast]);

  // Boost prompt handler
  const handleBoostPrompt = useCallback(async () => {
    if (!params.prompt.trim()) {
      toast({
        title: 'Введите описание',
        description: 'Сначала заполните поле с описанием музыки',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: '✨ Улучшаем промпт...',
      description: 'AI обрабатывает ваше описание',
    });
    
    logger.info('✨ [BOOST] Improving prompt:', params.prompt.substring(0, 50));
    const boosted = await boostStyle(params.prompt);
    
    if (boosted) {
      setParam('prompt', boosted);
      setDebouncedPrompt(boosted);
      toast({
        title: '✅ Промпт улучшен',
        description: 'AI добавил детали для лучшего результата',
      });
      logger.info('✅ [BOOST] Prompt improved');
    } else {
      toast({
        title: 'Не удалось улучшить',
        description: 'Попробуйте еще раз или используйте текущее описание',
        variant: 'destructive'
      });
    }
  }, [params.prompt, boostStyle, setParam, toast]);

  // Audio file handlers
  const handleAudioFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAudioFile(file);
      setAudioPreviewOpen(true);
    }
    e.target.value = '';
  }, []);

  const handleAudioConfirm = useCallback(async () => {
    if (!pendingAudioFile) return;

    const url = await uploadAudio(pendingAudioFile);
    if (url) {
      setParam('referenceAudioUrl', url);
      setParam('referenceFileName', pendingAudioFile.name);
      setMode('custom');
      setPendingAudioFile(null);
      toast({
        title: '🎵 Референс добавлен',
        description: 'Переключено на расширенный режим для настройки',
      });
    }
  }, [pendingAudioFile, uploadAudio, setParam, toast]);

  const handleRemoveAudio = useCallback(() => {
    setParam('referenceAudioUrl', null);
    setParam('referenceFileName', null);
    setParam('referenceTrackId', null);
    setPendingAudioFile(null);
  }, [setParam]);

  const handleSelectReferenceTrack = useCallback((track: { id: string; audio_url: string; title: string }) => {
    setParam('referenceTrackId', track.id);
    setParam('referenceAudioUrl', track.audio_url);
    setParam('referenceFileName', track.title);
    setMode('custom');
    logger.info('Reference track selected', 'MusicGeneratorV2', { trackId: track.id, title: track.title });
    toast({
      title: '🎵 Трек выбран',
      description: `Используется "${track.title}" как референс`,
    });
  }, [setParam, toast]);

  const handleRecordComplete = useCallback(async (audioUrl: string) => {
    setParam('referenceAudioUrl', audioUrl);
    setParam('referenceFileName', 'Записанное аудио');
    setMode('custom');
    logger.info('Audio recorded', 'MusicGeneratorV2', { audioUrl: audioUrl.substring(0, 50) });
    toast({
      title: '🎤 Запись завершена',
      description: 'Аудио добавлено как референс',
    });
  }, [setParam, toast]);

  // ✅ НОВОЕ: Auto-apply логика для результатов анализа
  const handleAnalysisComplete = useCallback((result: {
    recognition: any;
    description: any;
  }) => {
    logger.info('🔍 [ANALYSIS] Analysis completed', 'MusicGeneratorV2', {
      hasRecognition: !!result.recognition,
      hasDescription: !!result.description
    });

    // Автоматически применить название если распознано
    if (result.recognition?.recognized_title && !params.title.trim()) {
      const recognizedTitle = result.recognition.recognized_title;
      const artist = result.recognition.recognized_artist;
      const suggestedTitle = artist 
        ? `${recognizedTitle} (Cover by AI)`
        : `${recognizedTitle}`;

      setParam('title', suggestedTitle);
      
      logger.info('✅ [AUTO-APPLY] Title applied', 'MusicGeneratorV2', { title: suggestedTitle });
      toast({
        title: '✅ Название применено',
        description: `"${suggestedTitle}"`,
        duration: 4000,
      });
    }

    // Автоматически подставить характеристики в промпт
    if (result.description?.detected_genre) {
      const characteristics: string[] = [];
      
      if (result.description.detected_genre) {
        characteristics.push(result.description.detected_genre);
      }
      if (result.description.detected_mood) {
        characteristics.push(`${result.description.detected_mood} mood`);
      }
      if (result.description.tempo_bpm) {
        const tempoDesc = result.description.tempo_bpm > 120 ? 'fast tempo' : 'slow tempo';
        characteristics.push(`${tempoDesc} (${result.description.tempo_bpm} BPM)`);
      }
      if (result.description.detected_instruments && result.description.detected_instruments.length > 0) {
        characteristics.push(`featuring ${result.description.detected_instruments.slice(0, 3).join(', ')}`);
      }

      const analysisPrompt = characteristics.join(', ');

      // Добавить к существующему промпту или создать новый
      if (params.prompt.trim()) {
        toast({
          title: '💡 AI-анализ готов',
          description: `Характеристики: ${analysisPrompt}`,
          duration: 5000,
        });
      } else {
        setParam('prompt', analysisPrompt);
        setDebouncedPrompt(analysisPrompt);
        
        logger.info('✅ [AUTO-APPLY] Prompt generated from analysis', 'MusicGeneratorV2', {
          prompt: analysisPrompt
        });
        toast({
          title: '✅ Промпт сгенерирован',
          description: 'AI описал характеристики трека',
          duration: 4000,
        });
      }

      // Добавить инструменты в теги
      if (result.description.detected_instruments && result.description.detected_instruments.length > 0) {
        const existingTags = params.tags.split(',').map(t => t.trim()).filter(Boolean);
        const instrumentTags = result.description.detected_instruments.slice(0, 5);
        const uniqueTags = Array.from(new Set([...existingTags, ...instrumentTags]));
        
        setParam('tags', uniqueTags.join(', '));
        
        logger.info('✅ [AUTO-APPLY] Instrument tags added', 'MusicGeneratorV2', {
          tags: instrumentTags
        });
      }
    }
  }, [params.title, params.prompt, params.tags, setParam, toast]);

  // Preset handler
  const handlePresetSelect = useCallback((preset: GenrePreset) => {
    setParams(prev => ({
      ...prev,
      prompt: preset.promptSuggestion,
      tags: preset.styleTags.join(', '),
    }));
    setDebouncedPrompt(preset.promptSuggestion);
    setShowPresets(false);
  }, []);

  // Main generation handler
  // ✅ NEW: Handle Mureka lyrics variant selection
  const handleMurekaLyricsSelect = useCallback(async (lyrics: string, variantId: string) => {
    if (!murekaLyricsDialog.trackId) return;
    
    try {
      logger.info('User selected Mureka lyrics variant', undefined, {
        trackId: murekaLyricsDialog.trackId,
        variantId
      });
      
      // Обновляем трек выбранной лирикой и продолжаем генерацию
      const { error } = await supabase
        .from('tracks')
        .update({
          lyrics: lyrics,
          metadata: {
            selected_lyrics_variant_id: variantId,
            stage: 'composing_music',
            stage_description: 'Создание музыки...'
          }
        })
        .eq('id', murekaLyricsDialog.trackId);
      
      if (error) throw error;
      
      sonnerToast.success('Текст выбран! Продолжаем создание музыки...', {
        duration: 3000
      });
      
      // Обновляем локальные параметры
      setParam('lyrics', lyrics);
      
    } catch (error) {
      logger.error('Failed to apply lyrics variant', error as Error);
      sonnerToast.error('Ошибка применения текста');
    }
  }, [murekaLyricsDialog.trackId, setParam]);

  const handleGenerate = useCallback(async () => {
    vibrate('heavy');

    // Pre-flight balance check for Suno
    if (selectedProvider === 'suno') {
      const credits = sunoBalance?.balance || 0;
      if (credits === 0) {
        toast({
          title: '❌ Недостаточно кредитов',
          description: 'У вас закончились кредиты Suno. Пополните баланс для продолжения.',
          variant: 'destructive'
        });
        return;
      }
      if (credits < 10) {
        toast({
          title: '⚠️ Низкий баланс',
          description: `У вас осталось ${credits} кредитов Suno`,
          duration: 3000,
        });
      }
    }

    // Validation
    const hasPrompt = params.prompt.trim().length > 0;
    const hasLyrics = params.lyrics.trim().length > 0;
    const hasReferenceAudio = !!params.referenceAudioUrl;

    if (!hasPrompt && !hasLyrics) {
      toast({ 
        title: 'Заполните промпт или текст песни', 
        description: 'Хотя бы одно поле должно быть заполнено',
        variant: 'destructive' 
      });
      return;
    }

    if (hasReferenceAudio && !hasPrompt && !hasLyrics) {
      toast({
        title: 'Добавьте описание',
        description: 'Референсное аудио лучше работает с промптом или текстом',
        variant: 'destructive'
      });
      return;
    }

    if (hasLyrics && !hasPrompt) {
      toast({
        title: '💡 Совет',
        description: 'Добавьте описание стиля для лучшего результата',
        duration: 3000,
      });
    }

    const hasVocals = params.vocalGender !== 'instrumental';
    const vocalGenderParam = (hasVocals && params.vocalGender !== 'any') 
      ? params.vocalGender.substring(0, 1) as 'f' | 'm' 
      : undefined;

    const requestParams = {
      prompt: params.prompt.trim(),
      title: params.title.trim() || undefined,
      lyrics: hasVocals && params.lyrics.trim() ? params.lyrics.trim() : undefined,
      hasVocals,
      styleTags: params.tags.split(',').map(t => t.trim()).filter(Boolean),
      negativeTags: params.negativeTags.trim() || undefined,
      weirdnessConstraint: params.weirdness / 100,
      styleWeight: params.styleWeight / 100,
      lyricsWeight: params.lyrics.trim() ? params.lyricsWeight / 100 : undefined,
      audioWeight: params.referenceAudioUrl ? params.audioWeight / 100 : undefined,
      vocalGender: vocalGenderParam,
      customMode: true,
      modelVersion: params.modelVersion,
      referenceAudioUrl: params.referenceAudioUrl || undefined,
      referenceTrackId: params.referenceTrackId || undefined,
      provider: selectedProvider,
    };

    // Save to history
    try {
      await savePrompt({
        prompt: params.prompt,
        lyrics: params.lyrics || undefined,
        style_tags: params.tags ? params.tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        provider: selectedProvider as 'suno' | 'mureka',
      });
    } catch (error) {
      logger.error('[MusicGeneratorV2] Failed to save prompt:', error instanceof Error ? error : undefined);
    }

    logger.info('🎵 [GENERATE] Starting generation', 
      `Prompt: ${!!params.prompt.trim()}, Lyrics: ${!!params.lyrics.trim()}, Audio: ${!!params.referenceAudioUrl}, Mode: ${mode}`
    );

    const started = await generate(requestParams);
    if (started) {
      setParams(prev => ({
        ...prev,
        title: '',
        prompt: '',
        lyrics: '',
        tags: '',
      }));
      setDebouncedPrompt('');
      setDebouncedLyrics('');
    }
  }, [params, generate, toast, vibrate, mode, selectedProvider, sunoBalance, savePrompt]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && !isGenerating) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, isGenerating]);

  const tempAudioUrl = pendingAudioFile ? URL.createObjectURL(pendingAudioFile) : '';
  const lyricsLineCount = params.lyrics ? params.lyrics.split('\n').filter(l => l.trim()).length : 0;
  const isMobile = useIsMobile();

  return (
    <motion.div 
      className={cn(
        "flex flex-col h-full card-elevated",
        isMobile && "rounded-none"
      )}
      data-testid="music-generator"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <GeneratorHeader
        selectedProvider={selectedProvider as 'suno' | 'mureka'}
        onProviderChange={(provider) => setProvider(provider as any)}
        mode={mode}
        onModeChange={setMode}
        modelVersion={params.modelVersion}
        onModelChange={(version) => setParam('modelVersion', version)}
        availableModels={[...currentModels]}
        isGenerating={isGenerating}
        referenceFileName={params.referenceFileName}
        lyricsLineCount={lyricsLineCount}
      />

      {/* Main Content */}
      <ScrollArea className={cn(
        "flex-grow",
        isMobile && "max-h-[calc(90vh-120px)]"
      )}>
        <div className={cn(
          "space-y-2",
          isMobile ? "p-3" : "p-2.5"
        )}>
          {mode === 'simple' ? (
            <SimpleModeForm
              params={params}
              onParamChange={setParam}
              onBoostPrompt={handleBoostPrompt}
              onGenerate={handleGenerate}
              isBoosting={isBoosting}
              isGenerating={isGenerating}
              showPresets={showPresets}
              onPresetSelect={handlePresetSelect}
              debouncedPrompt={debouncedPrompt}
              onDebouncedPromptChange={setDebouncedPrompt}
            />
          ) : (
            <CustomModeForm
              params={params}
              onParamChange={setParam}
              onBoostPrompt={handleBoostPrompt}
              onGenerate={handleGenerate}
              onOpenLyricsDialog={() => setLyricsDialogOpen(true)}
              onOpenHistory={() => setHistoryDialogOpen(true)}
              onAudioFileSelect={handleAudioFileSelect}
              onRemoveAudio={handleRemoveAudio}
              onSelectReferenceTrack={handleSelectReferenceTrack}
              onRecordComplete={handleRecordComplete}
              onAnalysisComplete={handleAnalysisComplete}
              isBoosting={isBoosting}
              isGenerating={isGenerating}
              isUploading={isUploading}
              debouncedPrompt={debouncedPrompt}
              debouncedLyrics={debouncedLyrics}
              onDebouncedPromptChange={setDebouncedPrompt}
              onDebouncedLyricsChange={setDebouncedLyrics}
            />
          )}
        </div>
      </ScrollArea>

      {/* Dialogs */}
      <AudioPreviewDialog
        open={audioPreviewOpen}
        onOpenChange={(open) => {
          setAudioPreviewOpen(open);
          if (!open) setPendingAudioFile(null);
        }}
        onConfirm={handleAudioConfirm}
        onRemove={handleRemoveAudio}
        audioUrl={tempAudioUrl}
        fileName={pendingAudioFile?.name || ''}
      />

      <LyricsGeneratorDialog
        open={lyricsDialogOpen}
        onOpenChange={setLyricsDialogOpen}
        trackId={params.trackId}
        onGenerated={(lyrics: string) => {
          setParam('lyrics', lyrics);
          setDebouncedLyrics(lyrics);
          setLyricsDialogOpen(false);
        }}
      />

      {/* ✅ NEW: Mureka Lyrics Variant Selection Dialog */}
      <MurekaLyricsVariantDialog
        open={murekaLyricsDialog.open}
        onOpenChange={(open) => setMurekaLyricsDialog(prev => ({ ...prev, open }))}
        trackId={murekaLyricsDialog.trackId}
        jobId={murekaLyricsDialog.jobId}
        onSelectVariant={handleMurekaLyricsSelect}
      />

      <PromptHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        onSelect={(historyItem: {
          prompt: string;
          lyrics?: string;
          style_tags?: string[];
        }) => {
          setParam('prompt', historyItem.prompt);
          setDebouncedPrompt(historyItem.prompt);
          if (historyItem.lyrics) {
            setParam('lyrics', historyItem.lyrics);
            setDebouncedLyrics(historyItem.lyrics);
          }
          if (historyItem.style_tags?.length) {
            setParam('tags', historyItem.style_tags.join(', '));
          }
          setHistoryDialogOpen(false);
        }}
      />
    </motion.div>
  );
};

export const MusicGeneratorV2 = memo(MusicGeneratorV2Component);
