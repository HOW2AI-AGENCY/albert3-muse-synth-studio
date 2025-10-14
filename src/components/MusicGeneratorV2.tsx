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
import { PromptHistoryDialog } from '@/components/generator/PromptHistoryDialog';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { useProviderBalance } from '@/hooks/useProviderBalance';
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

  // Sync provider with model version
  useEffect(() => {
    const defaultModel = getDefaultModel(selectedProvider as ProviderType);
    setParams(prev => ({ 
      ...prev, 
      provider: selectedProvider,
      modelVersion: defaultModel.value
    }));
  }, [selectedProvider]);

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
    setPendingAudioFile(null);
  }, [setParam]);

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

  return (
    <motion.div 
      className="flex flex-col h-full card-elevated" 
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
      <ScrollArea className="flex-grow">
        <div className="p-2.5 space-y-2">
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
        onGenerated={(lyrics: string) => {
          setParam('lyrics', lyrics);
          setDebouncedLyrics(lyrics);
          setLyricsDialogOpen(false);
        }}
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
