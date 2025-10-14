import { memo, useCallback, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Music, Loader2, Plus, FileAudio, FileText, SlidersHorizontal, Sparkles, Mic, Wand2, X, Volume2, Palette, History } from '@/utils/iconImports';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useGenerateMusic } from '@/hooks/useGenerateMusic';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { useAudioUpload } from '@/hooks/useAudioUpload';
import { useBoostStyle } from '@/hooks/useBoostStyle';
import { AudioPreviewDialog } from '@/components/audio/AudioPreviewDialog';
import { LyricsGeneratorDialog } from '@/components/lyrics/LyricsGeneratorDialog';
import { AudioRecorder } from '@/components/audio/AudioRecorder';
import { TagsCarousel } from '@/components/generator/TagsCarousel';
import { AudioAnalyzer } from '@/components/audio/AudioAnalyzer';
import { PromptHistoryDialog } from '@/components/generator/PromptHistoryDialog';
import { GenrePresets } from '@/components/generator/GenrePresets';
import { usePromptHistory } from '@/hooks/usePromptHistory';
import { ProviderSelector } from '@/components/mureka/ProviderSelector';
import { MurekaBalanceDisplay } from '@/components/mureka/MurekaBalanceDisplay';
import { SunoBalanceDisplay } from '@/components/mureka/SunoBalanceDisplay';
import { logger } from '@/utils/logger';
import { getProviderModels, getDefaultModel, type MusicProvider as ProviderType, type ModelVersion } from '@/config/provider-models';
import { useProviderBalance } from '@/hooks/useProviderBalance';

interface MusicGeneratorV2Props {
  onTrackGenerated?: () => void;
}

type VocalGender = 'any' | 'female' | 'male' | 'instrumental';
type GeneratorMode = 'simple' | 'custom';

const vocalGenderOptions: { value: VocalGender; label: string }[] = [
  { value: 'any', label: 'Любой' },
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
  { value: 'instrumental', label: 'Без вокала' },
];

const MusicGeneratorV2Component = ({ onTrackGenerated }: MusicGeneratorV2Props) => {
  const { selectedProvider, setProvider } = useMusicGenerationStore();
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  
  const { generate, isGenerating } = useGenerateMusic({ 
    provider: selectedProvider, 
    onSuccess: onTrackGenerated,
    toast 
  });
  
  // Get model versions based on selected provider
  const currentModels = getProviderModels(selectedProvider as ProviderType);
  const { uploadAudio, isUploading } = useAudioUpload();
  const { boostStyle, isBoosting } = useBoostStyle();
  
  // ✅ TASK C: Get Suno balance for pre-flight check
  const { balance: sunoBalance } = useProviderBalance();
  const { savePrompt } = usePromptHistory();

  // UI State
  const [mode, setMode] = useState<GeneratorMode>('simple');
  const [audioPreviewOpen, setAudioPreviewOpen] = useState(false);
  const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  const [pendingAudioFile, setPendingAudioFile] = useState<File | null>(null);
  const [recordingMode, setRecordingMode] = useState(false);

  const [params, setParams] = useState({
    prompt: '',
    title: '',
    lyrics: '',
    tags: '',
    negativeTags: '',
    vocalGender: 'any' as VocalGender,
    modelVersion: selectedProvider === 'mureka' ? 'auto' : 'V5',
    referenceAudioUrl: null as string | null,
    referenceFileName: null as string | null,
    audioWeight: 50,
    styleWeight: 75,
    lyricsWeight: 70,
    weirdness: 10,
    provider: selectedProvider,
  });

  const setParam = <K extends keyof typeof params>(key: K, value: (typeof params)[K]) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  // Sync provider selection with global state and update model version
  useEffect(() => {
    const defaultModel = getDefaultModel(selectedProvider as ProviderType);
    setParams(prev => ({ 
      ...prev, 
      provider: selectedProvider,
      modelVersion: defaultModel.value
    }));
  }, [selectedProvider]);

  // ✅ Улучшенный Boost с обратной связью
  const handleBoostPrompt = async () => {
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
  };

  const handleAudioFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPendingAudioFile(file);
      setAudioPreviewOpen(true);
    }
    e.target.value = '';
  };

  const handleAudioConfirm = async () => {
    if (!pendingAudioFile) return;

    const url = await uploadAudio(pendingAudioFile);
    if (url) {
      setParam('referenceAudioUrl', url);
      setParam('referenceFileName', pendingAudioFile.name);
      setPendingAudioFile(null);
      toast({
        title: '🎵 Референс добавлен',
        description: 'Теперь можно настроить вес аудио в параметрах',
      });
    }
  };

  const handleRemoveAudio = () => {
    setParam('referenceAudioUrl', null);
    setParam('referenceFileName', null);
    setPendingAudioFile(null);
  };

  const handleRecordComplete = (url: string) => {
    setParam('referenceAudioUrl', url);
    setParam('referenceFileName', `recording-${Date.now()}.webm`);
    setRecordingMode(false);
    toast({
      title: '🎤 Запись добавлена',
      description: 'Используется как референсное аудио',
    });
  };

  const handlePresetSelect = (preset: {
    styleTags: string[];
    mood?: string;
    promptSuggestion: string;
  }) => {
    setParams(prev => ({
      ...prev,
      prompt: preset.promptSuggestion,
      tags: preset.styleTags.join(', '),
    }));
    setShowPresets(false);
  };

  const handleGenerate = useCallback(async () => {
    vibrate('heavy');

    // ✅ TASK C: Pre-flight balance check for Suno
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

    // ✅ Улучшенная валидация с предупреждениями
    const hasPrompt = params.prompt.trim().length > 0;
    const hasLyrics = params.lyrics.trim().length > 0;
    const hasReferenceAudio = !!params.referenceAudioUrl;

    // Базовая валидация
    if (!hasPrompt && !hasLyrics) {
      toast({ 
        title: 'Заполните промпт или текст песни', 
        description: 'Хотя бы одно поле должно быть заполнено',
        variant: 'destructive' 
      });
      return;
    }

    // ✅ Предупреждения для нестандартных комбинаций
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
      provider: selectedProvider, // ✅ Добавляем провайдер
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
    }
  }, [params, generate, toast, onTrackGenerated, vibrate, mode, selectedProvider, sunoBalance]);

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
      {/* Header: Provider Selector + Tabs + Model Version */}
      <div className="p-2 sm:p-2.5 border-b border-border/20 space-y-1.5 sm:space-y-2">
        {/* Provider Selector Row with Balance */}
        <div className="flex flex-col xs:flex-row items-stretch xs:items-center gap-1.5 xs:gap-2">
          <div className="flex-1">
            <ProviderSelector
              value={selectedProvider}
              onChange={setProvider}
              disabled={isGenerating}
            />
          </div>
          {/* ✅ TASK C: Show balance for all providers */}
          <div className="flex items-center justify-end xs:justify-start">
            {selectedProvider === 'mureka' && <MurekaBalanceDisplay />}
            {selectedProvider === 'suno' && <SunoBalanceDisplay />}
          </div>
        </div>

        {/* Mode Tabs + Model Version Row */}
        <div className="flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Mode Tabs */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as GeneratorMode)} className="flex-1">
            <TabsList className="grid w-full grid-cols-2 h-7 sm:h-8">
              <TabsTrigger value="simple" className="text-[10px] xs:text-xs px-1 sm:px-3">
                Простой
              </TabsTrigger>
              <TabsTrigger value="custom" className="text-[10px] xs:text-xs px-1 sm:px-3">
                Расширенный
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Model Version */}
          <Select value={params.modelVersion} onValueChange={(v) => setParam('modelVersion', v)}>
            <SelectTrigger className="h-7 sm:h-8 w-16 xs:w-20 text-[10px] xs:text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {currentModels.map((m: ModelVersion) => (
                <SelectItem key={m.value} value={m.value} className="text-[10px] xs:text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {params.referenceFileName && (
            <Badge variant="secondary" className="h-5 text-[10px] gap-1 px-2">
              <FileAudio className="h-2.5 w-2.5" />
              Референс
            </Badge>
          )}
          {params.lyrics && (
            <Badge variant="secondary" className="h-5 text-[10px] gap-1 px-2">
              <FileText className="h-2.5 w-2.5" />
              {lyricsLineCount} строк
            </Badge>
          )}
        </div>
      </div>

      <ScrollArea className="flex-grow">
        <div className="p-2.5 space-y-2">
          {/* Simple Mode */}
          {mode === 'simple' && (
            <>
              {/* Genre Presets */}
              {showPresets && params.prompt.length === 0 && (
                <GenrePresets onSelect={handlePresetSelect} />
              )}

              {/* Song Description with Boost */}
              <div className="space-y-1">
                <Label htmlFor="prompt" className="text-xs font-medium">
                  Описание музыки
                  {!params.prompt.trim() && !params.lyrics.trim() && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Textarea
                    id="prompt"
                    placeholder="Опишите стиль, настроение и жанр..."
                    value={params.prompt}
                    onChange={(e) => setParam('prompt', e.target.value)}
                    className="min-h-[70px] text-sm resize-none pr-10"
                    disabled={isGenerating}
                    rows={3}
                  />
                  {params.prompt.trim() && (
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={handleBoostPrompt}
                      disabled={isBoosting || isGenerating}
                      title="Улучшить промпт с помощью AI"
                    >
                      <Sparkles className={cn("h-3.5 w-3.5", isBoosting && "animate-spin")} />
                    </Button>
                  </motion.div>
                  )}
                </div>
                {!params.prompt.trim() && !params.lyrics.trim() && (
                  <p className="text-[10px] text-muted-foreground">
                    💡 Заполните промпт или добавьте текст песни
                  </p>
                )}
              </div>

              {/* Tags Carousel */}
              <TagsCarousel
                onTagClick={(tag) => setParam('prompt', params.prompt ? `${params.prompt}, ${tag}` : tag)}
                disabled={isGenerating}
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => setHistoryDialogOpen(true)}
                    disabled={isGenerating}
                  >
                    <History className="h-3.5 w-3.5" />
                    История
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 text-xs px-3"
                    disabled={isGenerating}
                    onClick={() => document.getElementById('audio-upload-input')?.click()}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Audio
                  </Button>
                  <input
                    id="audio-upload-input"
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={handleAudioFileSelect}
                  />
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1 text-xs px-3"
                    disabled={isGenerating}
                    onClick={() => setLyricsDialogOpen(true)}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Lyrics
                  </Button>
                </div>

                <div className="flex items-center gap-1.5">
                  <Label className="text-xs text-muted-foreground">Без вокала</Label>
                  <Switch
                    checked={params.vocalGender === 'instrumental'}
                    onCheckedChange={(checked) => setParam('vocalGender', checked ? 'instrumental' : 'any')}
                    disabled={isGenerating}
                  />
                </div>
              </div>

              {/* More Settings Link */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
                onClick={() => setMode('custom')}
              >
                <SlidersHorizontal className="w-3 h-3 mr-1" />
                Больше настроек
              </Button>
            </>
          )}

          {/* Custom Mode */}
          {mode === 'custom' && (
            <>
              {/* Main Prompt with Boost */}
              <div className="space-y-1">
                <Label htmlFor="prompt" className="text-xs font-medium">
                  Описание стиля и настроения
                  {!params.prompt.trim() && !params.lyrics.trim() && (
                    <span className="text-destructive ml-0.5">*</span>
                  )}
                </Label>
                <div className="relative">
                  <Textarea
                    id="prompt"
                    placeholder="энергичный рок, мечтательный indie pop..."
                    value={params.prompt}
                    onChange={(e) => setParam('prompt', e.target.value)}
                    className="min-h-[70px] text-sm resize-none pr-10"
                    disabled={isGenerating}
                    rows={3}
                  />
                  {params.prompt.trim() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 h-6 w-6 text-primary hover:text-primary hover:bg-primary/10"
                      onClick={handleBoostPrompt}
                      disabled={isBoosting || isGenerating}
                      title="Улучшить промпт с помощью AI"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Lyrics Textarea - Always visible */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lyrics" className="text-xs font-medium">Текст песни</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs gap-1 px-2"
                    onClick={() => setLyricsDialogOpen(true)}
                    disabled={isGenerating}
                  >
                    <Wand2 className="h-3 w-3" />
                    AI генератор
                  </Button>
                </div>
                <Textarea
                  id="lyrics"
                  placeholder="Напишите текст или используйте AI генератор..."
                  value={params.lyrics}
                  onChange={(e) => setParam('lyrics', e.target.value)}
                  className="min-h-[60px] text-xs resize-none"
                  disabled={isGenerating}
                  rows={3}
                />
              </div>

              {/* Audio Buttons Row */}
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 gap-1 text-xs"
                  disabled={isGenerating || isUploading}
                  onClick={() => document.getElementById('audio-upload-input')?.click()}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Файл
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 h-9 gap-1 text-xs"
                  disabled={isGenerating || isUploading}
                  onClick={() => setRecordingMode(!recordingMode)}
                >
                  <Mic className="h-3.5 w-3.5" />
                  Записать
                </Button>
              </div>

              {/* Inline AudioRecorder */}
            {recordingMode && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <Card className="p-3 bg-primary/5 border-primary/20">
                  <AudioRecorder
                    onRecordComplete={handleRecordComplete}
                    onRemove={() => setRecordingMode(false)}
                  />
                </Card>
              </motion.div>
            )}

              {/* Reference Audio Display */}
              {params.referenceFileName && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs bg-secondary/30 px-2 py-1.5 rounded-md border border-border/30">
                    <FileAudio className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="flex-1 truncate">{params.referenceFileName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={handleRemoveAudio}
                      disabled={isGenerating}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                  {params.referenceAudioUrl && (
                    <AudioAnalyzer audioUrl={params.referenceAudioUrl} />
                  )}
                </div>
              )}

              {/* Advanced Settings - Accordion Groups */}
              {/* ✅ Открываем важные секции по умолчанию */}
              <Accordion type="multiple" defaultValue={["style", "vocal"]} className="space-y-1.5 pt-1">
                {/* Audio Controls - only if reference exists */}
                {params.referenceAudioUrl && (
                  <AccordionItem value="audio" className="border-none">
                    <AccordionTrigger className="py-2 px-2 hover:bg-secondary/50 rounded-md transition-colors hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-2">
                          <Volume2 className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">Контроль аудио</span>
                        </div>
                        <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                          {params.audioWeight}%
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 space-y-2 px-2 pb-3">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Вес аудио</Label>
                          <span className="text-xs text-muted-foreground font-mono">{params.audioWeight}%</span>
                        </div>
                        
                        {/* Visual representation */}
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground mb-1">
                          <span className={cn(
                            "transition-colors",
                            params.audioWeight < 30 && "text-primary font-medium"
                          )}>
                            Стиль
                          </span>
                          <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${params.audioWeight}%` }}
                            />
                          </div>
                          <span className={cn(
                            "transition-colors",
                            params.audioWeight > 70 && "text-primary font-medium"
                          )}>
                            Референс
                          </span>
                        </div>
                        
                        <Slider
                          value={[params.audioWeight]}
                          onValueChange={([v]) => setParam('audioWeight', v)}
                          max={100}
                          step={5}
                          disabled={isGenerating}
                          className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
                        />
                        <p className="text-[10px] text-muted-foreground">
                          Влияние референсного аудио на результат
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {/* Style Controls */}
                <AccordionItem value="style" className="border-none">
                  <AccordionTrigger className="py-2 px-2 hover:bg-secondary/50 rounded-md transition-colors hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <Palette className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Контроль стиля</span>
                      </div>
                      <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                        {params.styleWeight}% / {params.weirdness}%
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-2 px-2 pb-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Вес стиля</Label>
                        <span className="text-xs text-muted-foreground font-mono">{params.styleWeight}%</span>
                      </div>
                      <Slider
                        value={[params.styleWeight]}
                        onValueChange={([v]) => setParam('styleWeight', v)}
                        max={100}
                        step={5}
                        disabled={isGenerating}
                        className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Креативность</Label>
                        <span className="text-xs text-muted-foreground font-mono">{params.weirdness}%</span>
                      </div>
                      <Slider
                        value={[params.weirdness]}
                        onValueChange={([v]) => setParam('weirdness', v)}
                        max={100}
                        step={5}
                        disabled={isGenerating}
                        className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        0% = строго по промпту, 100% = полная свобода
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Vocal Controls */}
                <AccordionItem value="vocal" className="border-none">
                  <AccordionTrigger className="py-2 px-2 hover:bg-secondary/50 rounded-md transition-colors hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-2">
                      <div className="flex items-center gap-2">
                        <Mic className="h-3.5 w-3.5" />
                        <span className="text-xs font-medium">Контроль вокала</span>
                      </div>
                      <Badge variant="secondary" className="h-5 text-[10px] px-1.5">
                        {vocalGenderOptions.find(o => o.value === params.vocalGender)?.label || 'Любой'}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-2 space-y-2 px-2 pb-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Пол вокала</Label>
                      <Select
                        value={params.vocalGender}
                        onValueChange={(v) => setParam('vocalGender', v as VocalGender)}
                        disabled={isGenerating}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {vocalGenderOptions.map(o => (
                            <SelectItem key={o.value} value={o.value} className="text-xs">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {params.lyrics.trim() && (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Вес текста</Label>
                          <span className="text-xs text-muted-foreground font-mono">{params.lyricsWeight}%</span>
                        </div>
                        <Slider
                          value={[params.lyricsWeight]}
                          onValueChange={([v]) => setParam('lyricsWeight', v)}
                          max={100}
                          step={5}
                          disabled={isGenerating}
                          className="[&_[role=slider]]:h-3.5 [&_[role=slider]]:w-3.5"
                        />
                      </div>
                    )}
                    <div className="space-y-1">
                      <Label htmlFor="negative-tags" className="text-xs">Исключить стили</Label>
                      <Input
                        id="negative-tags"
                        placeholder="trap, eurodance"
                        value={params.negativeTags}
                        onChange={(e) => setParam('negativeTags', e.target.value)}
                        className="h-8 text-xs"
                        disabled={isGenerating}
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Generate Button - Fixed at bottom */}
      <div className="p-2.5 border-t border-border/20">
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || isUploading || (!params.prompt.trim() && !params.lyrics.trim())}
            className="w-full h-10 text-sm font-semibold gap-2 relative overflow-hidden group bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg transition-all"
          >
            <span className={cn(
              "flex items-center gap-2 transition-all duration-300",
              isGenerating && "opacity-0"
            )}>
              <Music className="h-4 w-4" />
              Создать трек
            </span>
            
            {isGenerating && (
              <motion.span 
                className="absolute inset-0 flex items-center justify-center gap-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Loader2 className="h-4 w-4 animate-spin" />
                Генерация...
              </motion.span>
            )}
            
            {/* Shine effect on hover */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          </Button>
        </motion.div>
      </div>

      {/* Dialogs */}
      <AudioPreviewDialog
        open={audioPreviewOpen}
        onOpenChange={(open) => {
          setAudioPreviewOpen(open);
          if (!open) setPendingAudioFile(null);
        }}
        audioUrl={tempAudioUrl}
        fileName={pendingAudioFile?.name || ''}
        onConfirm={handleAudioConfirm}
        onRemove={handleRemoveAudio}
      />

      <LyricsGeneratorDialog
        open={lyricsDialogOpen}
        onOpenChange={setLyricsDialogOpen}
        onGenerated={(lyrics: string) => {
          logger.info('📝 [LYRICS] Received generated lyrics, switching to custom mode');
          setParam('lyrics', lyrics);
          setMode('custom');
          setLyricsDialogOpen(false);
          toast({
            title: '✅ Лирика добавлена',
            description: 'Переключено на расширенный режим',
          });
        }}
      />

      <PromptHistoryDialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
        onSelect={(selectedParams) => {
          setParams(prev => ({
            ...prev,
            prompt: selectedParams.prompt,
            lyrics: selectedParams.lyrics || '',
            tags: selectedParams.style_tags?.join(', ') || '',
          }));
        }}
      />
    </motion.div>
  );
};

export const MusicGeneratorV2 = memo(MusicGeneratorV2Component);
