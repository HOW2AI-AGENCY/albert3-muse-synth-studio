import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Music,
  Loader2,
  Shuffle,
  Wand2,
  Plus,
  FileText,
  Mic2,
  ListMinus,
  SlidersHorizontal,
  Upload,
  Tag,
  X,
} from 'lucide-react';
import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { useProviderBalance } from '@/hooks/useProviderBalance';

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

const simplePromptExamples = [
  'Создай динамичный поп-трек с ярким припевом и танцевальным битом',
  'Инди-баллада с атмосферными синтезаторами и мягким вокалом',
  'Эпичный оркестровый саундтрек для приключенческого фильма',
  'Лоу-фай хип-хоп с расслабленным настроением для работы',
  'Энергичный рок-трек с мощными гитарами и драйвовым ритмом',
];

const customPromptExamples = [
  'Глубокий электро-поп с неоном 80-х и современными ритмами',
  'Темный трип-хоп с атмосферой поздней ночи и бархатным вокалом',
  'Теплый акустический трек с фолковыми гармониями и камерностью',
  'Экспериментальный поп с блеском глитча и плавным грувом',
  'Кинематографичный эмбиент с органическими текстурами и ростом напряжения',
];

const DEFAULT_STYLE_TAGS = [
  'synthwave',
  'dream pop',
  'cinematic',
  'indie rock',
  'lofi',
  'house',
];

const MAX_STYLE_TAGS = 6;

const normaliseStyleTag = (value: string) => value.trim().replace(/\s+/g, ' ');

const parseStyleTagInput = (value: string) =>
  value
    .split(/[\n,]/)
    .map(normaliseStyleTag)
    .filter((tag, index, array) => Boolean(tag) && array.findIndex((candidate) => candidate.toLowerCase() === tag.toLowerCase()) === index);

const toRatio = (value: number) => Number((Math.min(Math.max(value, 0), 100) / 100).toFixed(2));

const modelVersions = [
  { value: 'chirp-v3-5', label: 'Suno v5 (chirp-v3-5)' },
  { value: 'chirp-v3-0', label: 'Suno v4.5 (chirp-v3-0)' },
  { value: 'chirp-v2-5', label: 'Suno v4 (chirp-v2-5)' },
];

const vocalGenderOptions = [
  { value: 'any', label: 'Любой' },
  { value: 'female', label: 'Женский' },
  { value: 'male', label: 'Мужской' },
  { value: 'duet', label: 'Дуэт' },
  { value: 'instrumental', label: 'Без вокала' },
];

const pickRandom = (values: string[]) => values[Math.floor(Math.random() * values.length)];

const MusicGeneratorComponent = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const {
    generateMusic,
    isGenerating,
    isImproving,
    improvePrompt,
  } = useMusicGenerationStore();

  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  const { balance, isLoading: balanceLoading, error: balanceError } = useProviderBalance();

  type GenerateMusicParams = Parameters<typeof generateMusic>[0];

  const [generationMode, setGenerationMode] = useState<'simple' | 'custom'>('simple');
  const [selectedModel, setSelectedModel] = useState('chirp-v3-5');

  const [simplePrompt, setSimplePrompt] = useState('');
  const [simpleInstrumental, setSimpleInstrumental] = useState(false);

  const [songTitle, setSongTitle] = useState('');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [styleTagInput, setStyleTagInput] = useState('');
  const [excludeStyles, setExcludeStyles] = useState('');
  const [vocalGender, setVocalGender] = useState<'any' | 'female' | 'male' | 'duet' | 'instrumental'>('any');
  const [weirdness, setWeirdness] = useState(40);
  const [styleInfluence, setStyleInfluence] = useState(60);
  const [audioInfluence, setAudioInfluence] = useState(50);
  const [audioReference, setAudioReference] = useState<File | null>(null);
  const [openBlocks, setOpenBlocks] = useState<string[]>(['lyrics', 'style']);

  const lyricsRef = useRef<HTMLTextAreaElement | null>(null);
  const stylePromptRef = useRef<HTMLTextAreaElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const lyricStats = useMemo(() => {
    const trimmed = lyrics.trim();
    if (!trimmed) {
      return { lines: 0, characters: 0 };
    }

    const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
    return { lines, characters: trimmed.length };
  }, [lyrics]);

  useEffect(() => {
    if (balanceError) {
      toast({
        title: '⚠️ Не удалось загрузить баланс',
        description: balanceError,
        variant: 'destructive',
      });
    }
  }, [balanceError, toast]);

  const handleModeChange = useCallback((mode: string) => {
    setGenerationMode(mode as 'simple' | 'custom');
    if (mode === 'custom') {
      setOpenBlocks((current) => current.length ? current : ['lyrics', 'style']);
      requestAnimationFrame(() => {
        if (!lyrics.trim()) {
          lyricsRef.current?.focus();
        } else {
          stylePromptRef.current?.focus();
        }
      });
    }
  }, [lyrics]);

  const handleAddLyricsFromSimple = useCallback(() => {
    vibrate('light');
    setGenerationMode('custom');
    setOpenBlocks((current) => Array.from(new Set([...current, 'lyrics', 'style'])));
    requestAnimationFrame(() => {
      lyricsRef.current?.focus();
    });
  }, [vibrate]);

  const handleAudioFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      setAudioReference(null);
      return;
    }

    if (!file.type.startsWith('audio/')) {
      toast({
        title: '⚠️ Неподдерживаемый файл',
        description: 'Загрузите аудио в формате MP3, WAV или AIFF.',
        variant: 'destructive',
      });
      setAudioReference(null);
      return;
    }

    setAudioReference(file);
    setOpenBlocks((current) => Array.from(new Set([...current, 'advanced'])));
    toast({
      title: '🎧 Референс добавлен',
      description: `${file.name} будет учтён при генерации.`,
    });
  }, [toast]);

  const handleClearAudioReference = useCallback(() => {
    setAudioReference(null);
    setAudioInfluence(50);
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  }, []);

  const handleRandomizePrompt = useCallback((mode: 'simple' | 'custom') => {
    vibrate('medium');
    if (mode === 'simple') {
      setSimplePrompt(pickRandom(simplePromptExamples));
    } else {
      setCustomStylePrompt(pickRandom(customPromptExamples));
      setGenerationMode('custom');
      setOpenBlocks((current) => Array.from(new Set([...current, 'style'])));
      requestAnimationFrame(() => {
        stylePromptRef.current?.focus();
      });
    }
  }, [vibrate]);

  const handleEnhancePrompt = useCallback(async (mode: 'simple' | 'custom') => {
    const source = mode === 'simple' ? simplePrompt : customStylePrompt;
    const trimmed = source.trim();

    if (!trimmed) {
      toast({
        title: 'Введите описание',
        description: 'Добавьте хотя бы пару слов перед улучшением.',
        variant: 'destructive',
      });
      return;
    }

    vibrate('medium');
    const improved = await improvePrompt(trimmed, toast);

    if (!improved) {
      return;
    }

    if (mode === 'simple') {
      setSimplePrompt(improved);
    } else {
      setCustomStylePrompt(improved);
    }
  }, [customStylePrompt, improvePrompt, simplePrompt, toast, vibrate]);

  const handleAddStyleTag = useCallback((value?: string) => {
    const source = typeof value === 'string' ? value : styleTagInput;
    const parsed = parseStyleTagInput(source);

    if (parsed.length === 0) {
      if (typeof value !== 'string') {
        setStyleTagInput('');
      }
      return;
    }

    setStyleTags((previous) => {
      if (previous.length >= MAX_STYLE_TAGS) {
        return previous;
      }

      const next = [...previous];

      for (const tag of parsed) {
        if (next.length >= MAX_STYLE_TAGS) {
          break;
        }

        const exists = next.some((existing) => existing.toLowerCase() === tag.toLowerCase());
        if (!exists) {
          next.push(tag);
        }
      }

      return next;
    });

    if (typeof value !== 'string') {
      setStyleTagInput('');
    }
  }, [styleTagInput]);

  const handleRemoveStyleTag = useCallback((tag: string) => {
    setStyleTags((previous) => previous.filter((candidate) => candidate !== tag));
  }, []);

  const handleStyleTagKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if ((event.key === 'Enter' || event.key === ',') && !event.shiftKey) {
      event.preventDefault();
      handleAddStyleTag();
      return;
    }

    if (event.key === 'Backspace' && !styleTagInput && styleTags.length > 0) {
      event.preventDefault();
      setStyleTags((previous) => previous.slice(0, -1));
    }
  }, [handleAddStyleTag, styleTagInput, styleTags.length]);

  const validateForm = useCallback(() => {
    if (generationMode === 'simple') {
      if (!simplePrompt.trim()) {
        return 'Введите описание трека';
      }
      return null;
    }

    if (!customStylePrompt.trim() && !lyrics.trim()) {
      return 'Заполните стиль или добавьте лирику';
    }

    const hasStyleTags = styleTags.some((tag) => tag.trim().length > 0);
    if (!hasStyleTags) {
      return 'Добавьте хотя бы один тег стиля для кастомного режима';
    }

    return null;
  }, [customStylePrompt, generationMode, lyrics, simplePrompt, styleTags]);

  const prepareGenerationParams = useCallback((): GenerateMusicParams => {
    const basePrompt = generationMode === 'simple'
      ? simplePrompt.trim()
      : customStylePrompt.trim();

    const sections: string[] = [];

    if (basePrompt) {
      sections.push(basePrompt);
    }

    if (generationMode === 'simple') {
      if (simpleInstrumental) {
        sections.push('Сделай чистый инструментал без вокала.');
      }
    } else {
      if (excludeStyles.trim()) {
        sections.push(`Исключи стили: ${excludeStyles.trim()}`);
      }

      if (vocalGender === 'instrumental') {
        sections.push('Инструментал, вокал не нужен.');
      } else if (vocalGender !== 'any') {
        sections.push(`Предпочтительный тип вокала: ${vocalGender}.`);
      }

      sections.push(`Креативность (weirdness): ${weirdness}%.`);
      sections.push(`Стилевая точность: ${styleInfluence}%.`);

      if (audioReference) {
        sections.push(`Используй аудио-референс ${audioReference.name} с влиянием ${audioInfluence}%.`);
      }
    }

    const finalPrompt = sections.join('\n\n');
    const hasVocals = generationMode === 'custom'
      ? vocalGender !== 'instrumental'
      : !simpleInstrumental;
    const preparedLyrics = lyrics.trim();
    const sanitisedStyleTags = generationMode === 'custom'
      ? styleTags
          .map(normaliseStyleTag)
          .filter(Boolean)
      : [];
    const negativeTagsValue = generationMode === 'custom' ? excludeStyles.trim() : '';
    const styleWeightValue = generationMode === 'custom' ? toRatio(styleInfluence) : undefined;
    const weirdnessValue = generationMode === 'custom' ? toRatio(weirdness) : undefined;
    const audioWeightValue = audioReference ? toRatio(audioInfluence) : undefined;
    const resolvedVocalGender = generationMode === 'custom'
      ? vocalGender === 'female'
        ? 'f'
        : vocalGender === 'male'
          ? 'm'
          : undefined
      : undefined;
    const effectiveVocalGender = hasVocals ? resolvedVocalGender : undefined;

    return {
      prompt: finalPrompt,
      title: songTitle.trim() || undefined,
      lyrics: hasVocals && preparedLyrics ? preparedLyrics : undefined,
      hasVocals,
      styleTags: sanitisedStyleTags,
      negativeTags: negativeTagsValue || undefined,
      styleWeight: styleWeightValue,
      weirdnessConstraint: weirdnessValue,
      audioWeight: audioWeightValue,
      vocalGender: effectiveVocalGender,
      customMode: generationMode === 'custom',
      modelVersion: selectedModel,
    };
  }, [
    audioInfluence,
    audioReference,
    customStylePrompt,
    excludeStyles,
    generationMode,
    lyrics,
    selectedModel,
    simpleInstrumental,
    simplePrompt,
    songTitle,
    styleInfluence,
    styleTags,
    vocalGender,
    weirdness,
  ]);

  const resetFormState = useCallback(() => {
    setSimplePrompt('');
    setSimpleInstrumental(false);
    setSongTitle('');
    setCustomStylePrompt('');
    setLyrics('');
    setStyleTags([]);
    setStyleTagInput('');
    setExcludeStyles('');
    setVocalGender('any');
    setWeirdness(40);
    setStyleInfluence(60);
    setAudioInfluence(50);
    setAudioReference(null);
    setOpenBlocks(['lyrics', 'style']);
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    const error = validateForm();
    if (error) {
      toast({
        title: 'Нужно заполнить поля',
        description: error,
        variant: 'destructive',
      });
      return;
    }

    const params = prepareGenerationParams();
    vibrate('heavy');

    const started = await generateMusic(params, toast, onTrackGenerated);

    if (started) {
      resetFormState();
      setGenerationMode('simple');
    }
  }, [
    generateMusic,
    onTrackGenerated,
    prepareGenerationParams,
    resetFormState,
    toast,
    validateForm,
    vibrate,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void handleGenerate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate]);

  return (
    <div className="h-full w-full">
      <Card className="app-panel h-full">
        <div className="app-panel__header">
          <div className="app-stack app-stack--tight">
            <div className="app-inline app-inline--between">
              <div className="app-stack app-stack--tight">
                <h2 className="app-panel__heading">Создание трека</h2>
                <p className="app-panel__description">
                  Используйте быстрый режим или перейдите в продвинутый для точной настройки.
                </p>
              </div>
              <Tabs
                value={generationMode}
                onValueChange={handleModeChange}
                className="shrink-0"
              >
                <TabsList className="app-mode-toggle">
                  <TabsTrigger value="simple" className="app-mode-toggle__item">Простой</TabsTrigger>
                  <TabsTrigger value="custom" className="app-mode-toggle__item">Продвинутый</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="app-inline app-inline--between">
              <div className="flex items-center">
                {balanceLoading ? (
                  <Skeleton className="h-5 w-24 rounded-full" />
                ) : (
                  <Badge
                    variant="secondary"
                    className="app-chip bg-background/70 text-[11px] font-medium"
                  >
                    <Music className="h-3 w-3" />
                    <span>
                      {balance?.balance ?? 0} {balance?.currency ?? 'credits'}
                    </span>
                    <span className="hidden sm:inline text-muted-foreground">· {balance?.provider ?? 'unknown'}</span>
                  </Badge>
                )}
              </div>

              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-9 w-[160px] text-xs bg-background/60">
                  <SelectValue placeholder="Модель" />
                </SelectTrigger>
                <SelectContent>
                  {modelVersions.map((model) => (
                    <SelectItem key={model.value} value={model.value}>
                      {model.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScrollArea className="app-panel__scroll">
          <div className="app-panel__body app-stack">
            <div className="app-fieldset">
              <Label className="app-fieldset__label">
                <FileText className="h-4 w-4" />
                Заголовок (опционально)
              </Label>
              <Input
                placeholder="Введите название трека"
                value={songTitle}
                onChange={(event) => setSongTitle(event.target.value)}
                className="h-9 bg-background/60 text-sm"
                disabled={isGenerating}
              />
              <p className="app-fieldset__description">
                Можно оставить пустым — название придумаем автоматически.
              </p>
            </div>

            {generationMode === 'simple' ? (
              <div className="app-stack animate-fade-in">
                <div className="app-fieldset">
                  <div className="app-inline app-inline--between">
                    <Label className="app-fieldset__label">Опишите будущий трек</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1"
                        onClick={() => handleRandomizePrompt('simple')}
                        disabled={isGenerating}
                      >
                        <Shuffle className="h-3 w-3" />
                        Рандом
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 px-3 text-xs gap-1"
                        onClick={() => handleEnhancePrompt('simple')}
                        disabled={isImproving || isGenerating}
                      >
                        {isImproving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Wand2 className="h-3 w-3" />
                        )}
                        Улучшить
                      </Button>
                    </div>
                  </div>
                  <Textarea
                    placeholder="Опишите желаемую музыку, настроение и ключевые инструменты"
                    value={simplePrompt}
                    onChange={(event) => setSimplePrompt(event.target.value)}
                    className="min-h-[96px] resize-none bg-background/60 text-sm"
                    disabled={isGenerating}
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {simplePromptExamples.slice(0, 3).map((example) => (
                      <Button
                        key={example}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-3 text-xs"
                        onClick={() => setSimplePrompt(example)}
                        disabled={isGenerating}
                      >
                        {example}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="app-inline-card">
                  <div className="app-inline">
                    <Switch
                      id="simple-instrumental"
                      checked={simpleInstrumental}
                      onCheckedChange={(checked) => setSimpleInstrumental(Boolean(checked))}
                      disabled={isGenerating}
                    />
                    <Label htmlFor="simple-instrumental" className="app-fieldset__label">
                      <Music className="h-4 w-4" />
                      Сделать инструментал
                    </Label>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs gap-2"
                    onClick={handleAddLyricsFromSimple}
                    disabled={isGenerating}
                  >
                    <Mic2 className="h-3 w-3" />
                    Добавить лирику
                  </Button>
                </div>
              </div>
            ) : (
              <div className="app-stack animate-fade-in">
                <Accordion
                  type="multiple"
                  value={openBlocks}
                  onValueChange={(value) => setOpenBlocks(Array.isArray(value) ? value : [value])}
                  className="app-stack app-stack--tight"
                >
                  <AccordionItem value="lyrics" className="app-subsection border-none">
                    <AccordionTrigger className="app-subsection__header hover:no-underline">
                      <div className="flex items-center gap-2">
                        <Mic2 className="h-4 w-4" />
                        Лирика
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="app-subsection__body">
                      <Textarea
                        ref={lyricsRef}
                        placeholder="Напишите или вставьте текст песни"
                        value={lyrics}
                        onChange={(event) => setLyrics(event.target.value)}
                        className="min-h-[150px] resize-none bg-background/60 text-sm"
                        disabled={isGenerating}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{lyricStats.lines} строк</span>
                        <span>{lyricStats.characters} символов</span>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="style" className="app-subsection border-none">
                    <AccordionTrigger className="app-subsection__header hover:no-underline">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Стилевой промт
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="app-subsection__body">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs gap-1"
                          onClick={() => handleRandomizePrompt('custom')}
                          disabled={isGenerating}
                        >
                          <Shuffle className="h-3 w-3" />
                          Рандом
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-3 text-xs gap-1"
                          onClick={() => handleEnhancePrompt('custom')}
                          disabled={isImproving || isGenerating}
                        >
                          {isImproving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Wand2 className="h-3 w-3" />
                          )}
                          Улучшить
                        </Button>
                      </div>
                      <Textarea
                        ref={stylePromptRef}
                        placeholder="Опишите стиль, атмосферу, референсы"
                        value={customStylePrompt}
                        onChange={(event) => setCustomStylePrompt(event.target.value)}
                        className="min-h-[140px] resize-none bg-background/60 text-sm"
                        disabled={isGenerating}
                      />

                      <div className="app-stack app-stack--tight">
                        <Label className="app-fieldset__label">
                          <Tag className="h-4 w-4" />
                          Жанры и теги
                        </Label>
                        <div className="flex flex-col gap-app-tight sm:flex-row sm:items-center">
                          <Input
                            placeholder="Например: synthwave, dream pop"
                            value={styleTagInput}
                            onChange={(event) => setStyleTagInput(event.target.value)}
                            onKeyDown={handleStyleTagKeyDown}
                            className="h-9 bg-background/60 text-sm"
                            disabled={isGenerating}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="sm:w-auto h-9 px-3 text-xs"
                            onClick={() => handleAddStyleTag()}
                            disabled={isGenerating || !styleTagInput.trim() || styleTags.length >= MAX_STYLE_TAGS}
                          >
                            <Plus className="h-3 w-3" />
                            Добавить
                          </Button>
                        </div>
                        <p className="app-fieldset__description">
                          Добавьте жанры и ключевые теги, чтобы Suno точнее понял стиль. Максимум {MAX_STYLE_TAGS} тегов.
                        </p>

                        {styleTags.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {styleTags.map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="app-chip app-chip--removable gap-1"
                              >
                                <Tag className="h-3 w-3" />
                                {tag}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveStyleTag(tag)}
                                  className="focus:outline-none"
                                  aria-label={`Удалить тег ${tag}`}
                                  disabled={isGenerating}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="app-fieldset__description">
                            Пока теги не выбраны — добавьте хотя бы один, чтобы запустить генерацию.
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {DEFAULT_STYLE_TAGS.map((tag) => (
                            <Button
                              key={tag}
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-3 text-xs"
                              onClick={() => handleAddStyleTag(tag)}
                              disabled={isGenerating || styleTags.length >= MAX_STYLE_TAGS}
                            >
                              {tag}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="advanced" className="app-subsection border-none">
                    <AccordionTrigger className="app-subsection__header hover:no-underline">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Продвинутые настройки
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="app-subsection__body app-stack">
                      <div className="app-fieldset">
                        <Label className="app-fieldset__label">
                          <ListMinus className="h-4 w-4" />
                          Стили, которые нужно исключить
                        </Label>
                        <Input
                          placeholder="Например: trap, eurodance"
                          value={excludeStyles}
                          onChange={(event) => setExcludeStyles(event.target.value)}
                          className="h-9 bg-background/60 text-sm"
                          disabled={isGenerating}
                        />
                      </div>

                      <div className="app-fieldset">
                        <Label className="app-fieldset__label">Пол вокала</Label>
                        <Select
                          value={vocalGender}
                          onValueChange={(value: typeof vocalGender) => setVocalGender(value)}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="h-9 bg-background/60 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {vocalGenderOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="app-fieldset">
                        <Label className="app-fieldset__label">Weirdness</Label>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[weirdness]}
                          onValueChange={([value]) => setWeirdness(value)}
                          disabled={isGenerating}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>0%</span>
                          <span>{weirdness}%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      <div className="app-fieldset">
                        <Label className="app-fieldset__label">Style influence</Label>
                        <Slider
                          min={0}
                          max={100}
                          step={5}
                          value={[styleInfluence]}
                          onValueChange={([value]) => setStyleInfluence(value)}
                          disabled={isGenerating}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>0%</span>
                          <span>{styleInfluence}%</span>
                          <span>100%</span>
                        </div>
                      </div>

                      <div className="app-stack app-stack--tight">
                        <Label className="app-fieldset__label">
                          <Upload className="h-4 w-4" />
                          Аудио-референс
                        </Label>
                        <input
                          ref={audioInputRef}
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={handleAudioFileChange}
                          disabled={isGenerating}
                        />
                        {audioReference ? (
                          <div className="app-inline-card text-sm">
                            <span className="truncate max-w-[220px] sm:max-w-[260px]">{audioReference.name}</span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 px-3 text-xs"
                              onClick={handleClearAudioReference}
                              disabled={isGenerating}
                            >
                              Очистить
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs gap-2"
                            onClick={() => audioInputRef.current?.click()}
                            disabled={isGenerating}
                          >
                            <Plus className="h-3 w-3" />
                            Добавить референс
                          </Button>
                        )}
                        <p className="app-fieldset__description">
                          После загрузки появится ползунок влияния. Файл используется только во время генерации.
                        </p>

                        {audioReference && (
                          <div className="app-fieldset">
                            <Label className="app-fieldset__label">Audio influence</Label>
                            <Slider
                              min={0}
                              max={100}
                              step={5}
                              value={[audioInfluence]}
                              onValueChange={([value]) => setAudioInfluence(value)}
                              disabled={isGenerating}
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>0%</span>
                              <span>{audioInfluence}%</span>
                              <span>100%</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="app-panel__footer">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-10 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Music className="h-4 w-4" />
                Создать трек
              </>
            )}
          </Button>
          <div className="app-fieldset__description text-center mt-2">
            ⌘/Ctrl + Enter для запуска
          </div>
        </div>
      </Card>
    </div>
  );
};

export const MusicGenerator = memo(MusicGeneratorComponent);
