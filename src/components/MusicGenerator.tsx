import { memo, useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
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

    return null;
  }, [customStylePrompt, generationMode, lyrics, simplePrompt]);

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

    return {
      prompt: finalPrompt,
      title: songTitle.trim() || undefined,
      lyrics: hasVocals && preparedLyrics ? preparedLyrics : undefined,
      hasVocals,
      styleTags: [],
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
    vocalGender,
    weirdness,
  ]);

  const resetFormState = useCallback(() => {
    setSimplePrompt('');
    setSimpleInstrumental(false);
    setSongTitle('');
    setCustomStylePrompt('');
    setLyrics('');
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
      <Card className="h-full border-border/40 bg-background/95 backdrop-blur-sm shadow-lg">
        <div className="p-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {balanceLoading ? (
                <Skeleton className="h-6 w-24" />
              ) : (
                <Badge variant="secondary" className="text-xs px-2 py-1">
                  <Music className="h-3 w-3 mr-1" />
                  {balance?.balance ?? 0} {balance?.currency ?? 'credits'} · {balance?.provider ?? 'unknown'}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Tabs
                value={generationMode}
                onValueChange={handleModeChange}
                className="w-auto"
              >
                <TabsList className="h-9 p-1 bg-background/50">
                  <TabsTrigger value="simple" className="text-xs px-3">Simple</TabsTrigger>
                  <TabsTrigger value="custom" className="text-xs px-3">Custom</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-9 w-[120px] text-xs bg-background/50">
                  <SelectValue />
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

        <ScrollArea className="h-[calc(100%-80px)]">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Заголовок (опционально)
              </Label>
              <Input
                placeholder="Введите название трека"
                value={songTitle}
                onChange={(event) => setSongTitle(event.target.value)}
                className="h-9 bg-background/50 text-sm"
                disabled={isGenerating}
              />
              <p className="text-xs text-muted-foreground">
                Если поле оставить пустым, мы подберём название автоматически.
              </p>
            </div>

            {generationMode === 'simple' ? (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Опишите будущий трек</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => handleRandomizePrompt('simple')}
                        disabled={isGenerating}
                      >
                        <Shuffle className="h-3 w-3" />
                        Рандом
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
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
                    className="min-h-[120px] resize-none bg-background/50 text-sm"
                    disabled={isGenerating}
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border rounded-lg border-dashed border-border/60 p-3 bg-muted/10">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="simple-instrumental"
                      checked={simpleInstrumental}
                      onCheckedChange={(checked) => setSimpleInstrumental(Boolean(checked))}
                      disabled={isGenerating}
                    />
                    <Label htmlFor="simple-instrumental" className="text-sm flex items-center gap-2">
                      <Music className="h-4 w-4" />
                      Сделать инструментал
                    </Label>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-2"
                    onClick={handleAddLyricsFromSimple}
                    disabled={isGenerating}
                  >
                    <Mic2 className="h-3 w-3" />
                    Добавить лирику
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <Accordion
                  type="multiple"
                  value={openBlocks}
                  onValueChange={(value) => setOpenBlocks(Array.isArray(value) ? value : [value])}
                  className="space-y-2"
                >
                  <AccordionItem value="lyrics" className="border-border/40">
                    <AccordionTrigger className="text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Mic2 className="h-4 w-4" />
                        Лирика
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      <Textarea
                        ref={lyricsRef}
                        placeholder="Напишите или вставьте текст песни"
                        value={lyrics}
                        onChange={(event) => setLyrics(event.target.value)}
                        className="min-h-[160px] resize-none bg-background/50 text-sm"
                        disabled={isGenerating}
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{lyricStats.lines} строк</span>
                        <span>{lyricStats.characters} символов</span>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="style" className="border-border/40">
                    <AccordionTrigger className="text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Стилевой промт
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-2">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
                          onClick={() => handleRandomizePrompt('custom')}
                          disabled={isGenerating}
                        >
                          <Shuffle className="h-3 w-3" />
                          Рандом
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1"
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
                        className="min-h-[160px] resize-none bg-background/50 text-sm"
                        disabled={isGenerating}
                      />
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="advanced" className="border-border/40">
                    <AccordionTrigger className="text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4" />
                        Продвинутые настройки
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <ListMinus className="h-4 w-4" />
                          Стили, которые нужно исключить
                        </Label>
                        <Input
                          placeholder="Например: trap, eurodance"
                          value={excludeStyles}
                          onChange={(event) => setExcludeStyles(event.target.value)}
                          className="h-9 bg-background/50 text-sm"
                          disabled={isGenerating}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Пол вокала</Label>
                        <Select
                          value={vocalGender}
                          onValueChange={(value: typeof vocalGender) => setVocalGender(value)}
                          disabled={isGenerating}
                        >
                          <SelectTrigger className="h-9 bg-background/50 text-sm">
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

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Weirdness</Label>
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

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Style influence</Label>
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

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
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
                          <div className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2 text-sm">
                            <span className="truncate max-w-[220px] sm:max-w-[260px]">{audioReference.name}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={handleClearAudioReference}
                              disabled={isGenerating}
                            >
                              Очистить
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            className="text-xs gap-2"
                            onClick={() => audioInputRef.current?.click()}
                            disabled={isGenerating}
                          >
                            <Plus className="h-3 w-3" />
                            Добавить референс
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground">
                          После загрузки появится ползунок влияния. Файл используется только во время генерации.
                        </p>

                        {audioReference && (
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">Audio influence</Label>
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

        <div className="p-4 border-t border-border/40 bg-muted/20">
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
          <div className="text-xs text-muted-foreground text-center mt-2">
            ⌘/Ctrl + Enter для запуска
          </div>
        </div>
      </Card>
    </div>
  );
};

export const MusicGenerator = memo(MusicGeneratorComponent);
