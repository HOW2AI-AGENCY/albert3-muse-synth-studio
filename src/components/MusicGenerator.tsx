import { memo, useState, useCallback, useEffect, useRef, type ChangeEvent } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip';
import { 
  Music, Loader2, Plus, Wand2, Maximize2,
  Music2, FileText, Settings2, Play
} from 'lucide-react';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { useProviderBalance } from '@/hooks/useProviderBalance';

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

// Inspiration chips для Simple Mode
const inspirationChips = [
  { value: 'reggae', label: 'reggae', emoji: '🎵' },
  { value: 'trap', label: 'trap', emoji: '🔥' },
  { value: 'primal', label: 'primal', emoji: '⚡' },
  { value: 'piano', label: 'piano', emoji: '🎹' },
  { value: 'afrol', label: 'afrol', emoji: '🌍' },
  { value: 'hip-hop', label: 'hip-hop', emoji: '🎤' },
  { value: 'R&B', label: 'R&B', emoji: '💫' },
  { value: 'upbeat', label: 'upbeat', emoji: '⬆️' },
  { value: 'male and female duet', label: 'male and female duet', emoji: '👥' },
  { value: 'меланхоличный', label: 'меланхоличный', emoji: '🌙' },
  { value: 'alterna', label: 'alterna', emoji: '🎸' },
  { value: 'electronic', label: 'electronic', emoji: '🤖' },
  { value: 'atmospheric', label: 'atmospheric', emoji: '🌫️' },
  { value: 'acoustic', label: 'acoustic', emoji: '🎻' },
];

// Model versions
const modelVersions = [
  { value: 'chirp-v3-5', label: 'Suno v5 (chirp-v3-5)' },
  { value: 'chirp-v3-0', label: 'Suno v4.5 (chirp-v3-0)' },
  { value: 'chirp-v2-5', label: 'Suno v4 (chirp-v2-5)' },
];

// Vocal options
const vocalTypes = ['Lead Vocal', 'Backing Vocals', 'Duet', 'Choir', 'Rap Verse', 'Spoken Word'];

// Musical keys
const musicalKeys = ['C major', 'C minor', 'D major', 'D minor', 'E major', 'E minor', 'F major', 'F minor', 'G major', 'G minor', 'A major', 'A minor', 'B major', 'B minor'];

// Persona presets
const personaPresets = [
  { value: 'none', label: 'No persona', description: 'Позвольте модели подобрать подходящий тембр.' },
  { value: 'female-pop', label: 'Female Pop Lead', description: 'Яркий женский вокал с воздушными гармониями.' },
  { value: 'male-indie', label: 'Male Indie', description: 'Тёплый баритон для спокойных и гитарных треков.' },
  { value: 'duet', label: 'Duet Voices', description: 'Микс мужского и женского вокала для дуэтов.' },
];

const MusicGeneratorComponent = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const {
    generateMusic,
    isGenerating,
    isImproving,
    improvePrompt: hookImprovePrompt
  } = useMusicGeneration();

  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { balance, isLoading: balanceLoading, error: balanceError } = useProviderBalance();

  type GenerateMusicParams = Parameters<typeof generateMusic>[0];

  // Mode & UI State
  const [generationMode, setGenerationMode] = useState<'simple' | 'custom'>('simple');
  const [selectedModel, setSelectedModel] = useState('chirp-v3-5');
  const [customActiveTab, setCustomActiveTab] = useState<'audio' | 'persona' | 'lyrics'>('lyrics');

  // Simple Mode State
  const [songDescription, setSongDescription] = useState('');
  const [selectedInspirations, setSelectedInspirations] = useState<string[]>([]);
  const [isInstrumental, setIsInstrumental] = useState(false);

  // Custom Mode State
  const [lyrics, setLyrics] = useState('');
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [songTitle, setSongTitle] = useState('');
  const [selectedPersona, setSelectedPersona] = useState('');
  const [audioReference, setAudioReference] = useState<File | null>(null);

  // Advanced Options
  const [tempo, setTempo] = useState([120]);
  const [musicalKey, setMusicalKey] = useState('');
  const [hasVocals, setHasVocals] = useState(true);
  const [vocalType, setVocalType] = useState('');

  // UI State
  const [isLyricsDialogOpen, setIsLyricsDialogOpen] = useState(false);
  const [showVocalWarning, setShowVocalWarning] = useState(false);
  const [pendingWarningMessage, setPendingWarningMessage] = useState<string | null>(null);
  const [pendingGeneration, setPendingGeneration] = useState<GenerateMusicParams | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);

  const lyricLineCount = lyrics
    ? lyrics.split(/\r?\n/).filter((line) => line.trim().length > 0).length
    : 0;
  const lyricCharCount = lyrics.length;

  // Toggle inspiration chips
  const toggleInspiration = useCallback((chip: string) => {
    vibrate('light');
    setSelectedInspirations(prev => 
      prev.includes(chip) ? prev.filter(t => t !== chip) : [...prev, chip]
    );
  }, [vibrate]);
  
  // Toggle custom styles
  const toggleCustomStyle = useCallback((style: string) => {
    vibrate('light');
    setCustomStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  }, [vibrate]);

  const handleAudioQuickAction = useCallback(() => {
    vibrate('light');
    setGenerationMode('custom');
    setCustomActiveTab('audio');

    requestAnimationFrame(() => {
      audioInputRef.current?.focus();
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
        title: "⚠️ Неподдерживаемый файл",
        description: "Загрузите аудиофайл в формате MP3, WAV или AIFF.",
        variant: "destructive"
      });
      setAudioReference(null);
      return;
    }

    setAudioReference(file);
    toast({
      title: "🎧 Референс добавлен",
      description: `${file.name} будет использован как ориентир при генерации.`
    });
  }, [toast]);

  const handleClearAudioReference = useCallback(() => {
    setAudioReference(null);
    if (audioInputRef.current) {
      audioInputRef.current.value = '';
    }
  }, []);

  // Enhance prompt with AI
  const handleEnhancePrompt = useCallback(async () => {
    const currentPrompt = generationMode === 'simple' ? songDescription : lyrics;
    
    if (!currentPrompt.trim()) {
      toast({
        title: "❌ Ошибка",
        description: "Введите описание или текст для улучшения",
        variant: "destructive"
      });
      return;
    }

    vibrate('medium');

    const improved = await hookImprovePrompt(currentPrompt);

    if (!improved) {
      return;
    }

    if (generationMode === 'simple') {
      setSongDescription(improved);
    } else {
      setLyrics(improved);
    }
  }, [generationMode, songDescription, lyrics, hookImprovePrompt, vibrate, toast]);

  // Validation
  const validateForm = useCallback(() => {
    if (generationMode === 'simple') {
      if (!songDescription.trim() && selectedInspirations.length === 0) {
        return { valid: false, error: 'Введите описание или выберите вдохновение' };
      }
    } else {
      if (!songDescription.trim() && customStyles.length === 0 && !lyrics.trim()) {
        return { valid: false, error: 'Заполните хотя бы одно поле' };
      }
    }

    return { valid: true };
  }, [generationMode, songDescription, selectedInspirations, lyrics, customStyles]);

  const prepareGenerationParams = useCallback((): GenerateMusicParams => {
    let finalPrompt = songDescription.trim();
    const tags = generationMode === 'simple' ? selectedInspirations : customStyles;

    if (tags.length > 0) {
      const prefix = finalPrompt.length > 0 ? `${finalPrompt}\n\n` : '';
      finalPrompt = `${prefix}Styles: ${tags.join(', ')}`;
    }

    if (generationMode === 'custom') {
      const options: string[] = [];
      if (tempo[0] !== 120) options.push(`Tempo: ${tempo[0]} BPM`);
      if (musicalKey) options.push(`Key: ${musicalKey}`);
      if (vocalType) options.push(`Vocal: ${vocalType}`);
      if (selectedPersona) {
        const personaLabel = personaPresets.find(persona => persona.value === selectedPersona)?.label ?? selectedPersona;
        options.push(`Persona: ${personaLabel}`);
      }
      if (audioReference) {
        options.push(`Audio reference: ${audioReference.name}`);
      }

      if (options.length > 0) {
        finalPrompt = `${finalPrompt}\n\n${options.join(', ')}`;
      }
    }

    const shouldIncludeVocals = generationMode === 'simple' ? !isInstrumental : hasVocals;
    const sanitizedLyrics = lyrics.trim();

    return {
      prompt: finalPrompt,
      title: songTitle.trim() || undefined,
      lyrics: shouldIncludeVocals && sanitizedLyrics ? sanitizedLyrics : undefined,
      hasVocals: shouldIncludeVocals,
      styleTags: tags,
      customMode: generationMode === 'custom',
      modelVersion: selectedModel,
    };
  }, [
    audioReference,
    customStyles,
    generationMode,
    hasVocals,
    isInstrumental,
    lyrics,
    musicalKey,
    selectedInspirations,
    selectedModel,
    selectedPersona,
    songDescription,
    songTitle,
    tempo,
    vocalType,
  ]);

  const executeGeneration = useCallback(async (params: GenerateMusicParams) => {
    vibrate('heavy');

    try {
      const started = await generateMusic(params);

      if (!started) {
        return;
      }

      setSongDescription('');
      setSelectedInspirations([]);
      setCustomStyles([]);
      setLyrics('');
      setSongTitle('');
      setTempo([120]);
      setMusicalKey('');
      setHasVocals(true);
      setVocalType('');
      setIsInstrumental(false);
      setIsLyricsDialogOpen(false);
      setSelectedPersona('');
      setCustomActiveTab('lyrics');
      setAudioReference(null);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }

      if (onTrackGenerated) {
        onTrackGenerated();
      }
    } catch (error) {
      console.error('Error generating music:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось начать генерацию",
        variant: "destructive"
      });
    }
  }, [
    generateMusic,
    onTrackGenerated,
    setIsLyricsDialogOpen,
    toast,
    vibrate,
  ]);

  const handleWarningCancel = useCallback(() => {
    setShowVocalWarning(false);
    setPendingGeneration(null);
    setPendingWarningMessage(null);
  }, []);

  const handleWarningConfirm = useCallback(async () => {
    if (isGenerating || isImproving || !pendingGeneration) {
      return;
    }

    const params = pendingGeneration;
    handleWarningCancel();
    await executeGeneration(params);
  }, [executeGeneration, handleWarningCancel, isGenerating, isImproving, pendingGeneration]);

  // Generate music
  const handleGenerate = useCallback(async () => {
    const validation = validateForm();

    if (!validation.valid) {
      toast({
        title: "❌ Ошибка валидации",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    const params = prepareGenerationParams();

    if (validation.warning) {
      setPendingGeneration(params);
      setPendingWarningMessage(validation.warning);
      setShowVocalWarning(true);
      return;
    }

    await executeGeneration(params);
  }, [
    executeGeneration,
    prepareGenerationParams,
    toast,
    validateForm,
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setIsLyricsDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate]);

  useEffect(() => {
    if (balanceError) {
      toast({
        title: '⚠️ Не удалось загрузить баланс',
        description: balanceError,
        variant: 'destructive'
      });
    }
  }, [balanceError, toast]);

  return (
    <div className="h-full w-full">
      <Card className="h-full border-border/40 bg-background/95 backdrop-blur-sm shadow-lg">
        {/* Header */}
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
                onValueChange={(v) => setGenerationMode(v as 'simple' | 'custom')}
                className="w-auto"
              >
                <TabsList className="h-9 p-1 bg-background/50">
                  <TabsTrigger value="simple" className="text-xs px-3">Simple</TabsTrigger>
                  <TabsTrigger value="custom" className="text-xs px-3">Custom</TabsTrigger>
                </TabsList>
              </Tabs>

              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger className="h-9 w-[80px] text-xs bg-background/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {modelVersions.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <ScrollArea ref={scrollRef} className="h-[calc(100%-80px)]">
          <div className="p-4 space-y-4">
            {/* Simple Mode */}
            {generationMode === 'simple' && (
              <div className="space-y-4 animate-fade-in">
                {/* Song Description */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Song Description</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEnhancePrompt}
                      disabled={isImproving || !songDescription}
                      className="h-7 text-xs gap-1"
                    >
                      {isImproving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Wand2 className="h-3 w-3" />
                      )}
                      Enhance
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Hip-hop, R&B, upbeat"
                    value={songDescription}
                    onChange={(e) => setSongDescription(e.target.value)}
                    className="min-h-[80px] resize-none bg-background/50 text-sm"
                    disabled={isGenerating}
                  />
                </div>

                {/* Quick Actions */}
                <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={handleAudioQuickAction}
                        >
                          <Plus className="h-3 w-3" />
                          Audio
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-xs">
                        Загрузите аудио-референс во вкладке Custom → Audio. Функция в бета-режиме и используется для тонкой
                        настройки промпта.
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => setIsLyricsDialogOpen(true)}
                        >
                          <Plus className="h-3 w-3" />
                          Lyrics
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[220px] text-xs">
                        Добавьте собственные слова, если хотите перезаписать авто-сгенерированные вокальные партии.
                      </TooltipContent>
                    </Tooltip>

                    <div className="flex-1" />

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant={isInstrumental ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => setIsInstrumental(!isInstrumental)}
                        >
                          {isInstrumental && <Music className="h-3 w-3" />}
                          Без вокала
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[240px] text-xs">
                        Оставьте выключенным, если хотите, чтобы модель сама придумала вокал и текст. Включите, чтобы получить
                        чистый инструментал.
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
                <p className="text-xs text-muted-foreground">
                  Не обязательно писать текст заранее — модель сгенерирует вокал сама. Используйте кнопку Lyrics, чтобы
                  добавить собственные строки при необходимости или включите «Без вокала» для инструментала.
                </p>

                {/* Inspiration */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Inspiration</Label>
                  <ScrollArea className="w-full">
                    <div className="flex gap-2 pb-2">
                      {inspirationChips.map((chip) => (
                        <Button
                          key={chip.value}
                          variant={selectedInspirations.includes(chip.value) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleInspiration(chip.value)}
                          className="h-8 text-xs gap-1.5 whitespace-nowrap shrink-0"
                        >
                          <Plus className="h-3 w-3" />
                          {chip.label}
                        </Button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            )}

            {/* Custom Mode */}
            {generationMode === 'custom' && (
              <div className="space-y-4 animate-fade-in">
                {/* Tabs: Audio / Persona / Inspo */}
                <Tabs
                  value={customActiveTab}
                  onValueChange={(value) => setCustomActiveTab(value as 'audio' | 'persona' | 'lyrics')}
                  className="w-full"
                >
                  <TabsList className="grid w-full grid-cols-3 h-9 p-1">
                    <TabsTrigger value="audio" className="text-xs">
                      <Music2 className="h-3 w-3 mr-1" />
                      Audio
                    </TabsTrigger>
                    <TabsTrigger value="persona" className="text-xs">
                      <Settings2 className="h-3 w-3 mr-1" />
                      Persona
                    </TabsTrigger>
                    <TabsTrigger value="lyrics" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Inspo
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="audio" className="mt-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Beta</Badge>
                      <span>Аудио-референс помогает настроить тональность и энергетику трека.</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Audio reference</Label>
                      <input
                        ref={audioInputRef}
                        type="file"
                        accept="audio/*"
                        onChange={handleAudioFileChange}
                        className="hidden"
                      />
                      {audioReference ? (
                        <div className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2">
                          <div className="flex items-center gap-2 text-sm">
                            <Play className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px] sm:max-w-[260px]">{audioReference.name}</span>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={handleClearAudioReference}
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
                        >
                          <Plus className="h-3 w-3" />
                          Добавить референс
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Поддерживаются MP3, WAV, AIFF до 20 МБ. Референс используется только во время генерации и не сохраняется.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="persona" className="mt-4 space-y-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wide">Preview</Badge>
                      <span>Персона уточняет характер вокала, но итог зависит от модели.</span>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Vocal persona</Label>
                      <Select value={selectedPersona} onValueChange={setSelectedPersona}>
                        <SelectTrigger className="h-9 bg-background/50 text-xs">
                          <SelectValue placeholder="Выберите настроение голоса" />
                        </SelectTrigger>
                        <SelectContent>
                          {personaPresets.map((persona) => (
                            <SelectItem key={persona.value} value={persona.value}>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-sm font-medium">{persona.label}</span>
                                <span className="text-xs text-muted-foreground">{persona.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedPersona && (
                      <div className="rounded-md border border-dashed bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                        Мы добавим описание персонажа «{personaPresets.find(p => p.value === selectedPersona)?.label ?? selectedPersona}» в промпт, чтобы направить модель.
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="lyrics" className="mt-4 space-y-4">
                    {/* Song Description для Custom */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Description</Label>
                      <Textarea
                        placeholder="Describe your track..."
                        value={songDescription}
                        onChange={(e) => setSongDescription(e.target.value)}
                        className="min-h-[60px] resize-none bg-background/50 text-sm"
                      />
                    </div>
                  </TabsContent>
                </Tabs>

                {/* Accordion Sections */}
                <Accordion type="multiple" defaultValue={["lyrics", "styles"]} className="space-y-2">
                  {/* Lyrics */}
                  <AccordionItem value="lyrics" className="border rounded-lg px-4 bg-muted/10">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Lyrics
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-3">
                      <Textarea
                        placeholder="Write some lyrics (leave empty for instrumental)"
                        value={lyrics}
                        onChange={(e) => setLyrics(e.target.value)}
                        className="min-h-[100px] resize-none bg-background/50 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsLyricsDialogOpen(true)}
                          className="text-xs gap-1"
                        >
                          <Maximize2 className="h-3 w-3" />
                          Open Lyrics Editor
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Styles */}
                  <AccordionItem value="styles" className="border rounded-lg px-4 bg-muted/10">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                      <div className="flex items-center gap-2">
                        <Music2 className="h-4 w-4" />
                        Styles
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4">
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground">
                          Hip-hop, R&B, upbeat
                        </div>
                        <ScrollArea className="w-full">
                          <div className="flex gap-2 pb-2">
                            {inspirationChips.slice(0, 8).map((chip) => (
                              <Button
                                key={chip.value}
                                variant={customStyles.includes(chip.value) ? "default" : "outline"}
                                size="sm"
                                onClick={() => toggleCustomStyle(chip.value)}
                                className="h-7 text-xs gap-1 whitespace-nowrap shrink-0"
                              >
                                <Plus className="h-3 w-3" />
                                {chip.label}
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Advanced Options */}
                  <AccordionItem value="advanced" className="border rounded-lg px-4 bg-muted/10">
                    <AccordionTrigger className="text-sm font-medium hover:no-underline py-3">
                      <div className="flex items-center gap-2">
                        <Settings2 className="h-4 w-4" />
                        Advanced Options
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-4 space-y-4">
                      {/* Tempo */}
                      <div className="space-y-2">
                        <Label className="text-xs">Tempo (BPM): {tempo[0]}</Label>
                        <Slider
                          value={tempo}
                          onValueChange={setTempo}
                          min={60}
                          max={200}
                          step={1}
                          className="w-full"
                        />
                      </div>

                      {/* Key */}
                      <div className="space-y-2">
                        <Label className="text-xs">Key</Label>
                        <Select value={musicalKey} onValueChange={setMusicalKey}>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="Select key" />
                          </SelectTrigger>
                          <SelectContent>
                            {musicalKeys.map(k => (
                              <SelectItem key={k} value={k}>{k}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Vocals */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Vocals</Label>
                          <Switch checked={hasVocals} onCheckedChange={setHasVocals} />
                        </div>
                        
                        {hasVocals && (
                          <div className="space-y-3 pt-2">
                            <div className="space-y-2">
                              <Label className="text-xs">Vocal Type</Label>
                              <Select value={vocalType} onValueChange={setVocalType}>
                                <SelectTrigger className="h-9 text-sm">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {vocalTypes.map(v => (
                                    <SelectItem key={v} value={v}>{v}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Song Title */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Add a song title
                  </Label>
                  <Input
                    placeholder="Enter title (optional)"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    className="h-9 bg-background/50 text-sm"
                  />
                </div>

                {/* Workspace */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Workspace</Label>
                  <Select defaultValue="my-workspace">
                    <SelectTrigger className="h-9 bg-background/50 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="my-workspace">My Workspace</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer with Create Button */}
        <div className="p-4 border-t border-border/40 bg-muted/20">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-10 gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Create
              </>
            )}
          </Button>
          <div className="text-xs text-muted-foreground text-center mt-2">
            ⌘/Ctrl + Enter to generate
          </div>
        </div>
      </Card>

      {/* Lyrics Editor Dialog */}
      <Dialog open={isLyricsDialogOpen} onOpenChange={setIsLyricsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Lyrics editor</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Lyrics</Label>
              <Textarea
                value={lyrics}
                onChange={(event) => setLyrics(event.target.value)}
                placeholder="Write lyrics or paste your draft..."
                className="min-h-[200px] resize-none bg-background/50 text-sm"
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{lyricLineCount} lines</span>
              <span>{lyricCharCount} characters</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLyrics('')}
                disabled={!lyrics}
              >
                Clear lyrics
              </Button>
              <Button size="sm" onClick={() => setIsLyricsDialogOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={showVocalWarning}
        onOpenChange={(open) => {
          if (!open) {
            handleWarningCancel();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm generation</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingWarningMessage ?? ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleWarningCancel}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isGenerating || isImproving}
              onClick={() => void handleWarningConfirm()}
            >
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export const MusicGenerator = memo(MusicGeneratorComponent);