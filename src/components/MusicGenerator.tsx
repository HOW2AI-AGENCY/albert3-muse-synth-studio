import { memo, useState, useCallback, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Music, Loader2, Wand2, Maximize2,
  FileText, Settings2, Play, ChevronsUpDown
} from 'lucide-react';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

// Quick style chips
const quickStyleChips = [
  'acoustic', 'aggressive', 'ambient', 'ballad', 'cinematic',
  'classical', 'dark', 'electronic', 'epic', 'folk',
  'hip-hop', 'jazz', 'lo-fi', 'pop', 'R&B',
  'reggae', 'rock', 'sad', 'trap', 'upbeat'
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

const MusicGeneratorComponent = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const {
    generateMusic,
    isGenerating,
    setPrompt: setHookPrompt,
    improvePrompt: hookImprovePrompt
  } = useMusicGeneration();
  
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mode & UI State
  const [generationMode, setGenerationMode] = useState<'simple' | 'custom'>('simple');
  const [selectedModel, setSelectedModel] = useState('chirp-v3-5');
  
  // Simple Mode State
  const [songDescription, setSongDescription] = useState('');
  const [selectedInspirations, setSelectedInspirations] = useState<string[]>([]);
  const [isInstrumental, setIsInstrumental] = useState(false);
  
  // Custom Mode State
  const [lyrics, setLyrics] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  
  // UI State
  const [isLyricsDialogOpen, setIsLyricsDialogOpen] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  const lyricLineCount = lyrics
    ? lyrics.split(/\r?\n/).filter((line) => line.trim().length > 0).length
    : 0;
  const lyricCharCount = lyrics.length;

  // Toggle inspiration chips
  const toggleInspiration = useCallback((chip: string) => {
    vibrate('light');
    setStyleTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, [vibrate]);
  
  // Enhance prompt with AI
  const handleEnhancePrompt = useCallback(async () => {
    const currentPrompt = generationMode === 'simple' ? songDescription : lyrics;
    
    if (!currentPrompt.trim()) {
      toast({
        title: "❌ Ошибка",
        description: "Введите описание для улучшения",
        variant: "destructive"
      });
      return;
    }

    setIsImproving(true);
    vibrate('medium');

    try {
      // Set hook prompt first
      setHookPrompt(currentPrompt);
      // Call improve and receive improved text
      const improved = await hookImprovePrompt(currentPrompt);

      if (improved) {
        if (generationMode === 'simple') {
          setSongDescription(improved);
        } else {
          setLyrics(improved);
        }
      }
      
      toast({
        title: "✨ Промпт улучшен!",
        description: "Описание оптимизировано для лучшего результата"
      });
    } catch (error) {
      console.error('Error improving prompt:', error);
      toast({
        title: "❌ Ошибка",
        description: "Не удалось улучшить промпт",
        variant: "destructive"
      });
    } finally {
      setIsImproving(false);
    }
  }, [generationMode, songDescription, lyrics, setHookPrompt, hookImprovePrompt, vibrate, toast]);

  // Validation
  const validateForm = useCallback(() => {
    if (generationMode === 'simple') {
      if (!songDescription.trim() && selectedInspirations.length === 0) {
        return { valid: false, error: 'Введите описание или выберите вдохновение' };
      }
      
      if (!isInstrumental && !lyrics.trim()) {
        return { valid: true, warning: 'Вокал включён, но текстов нет. Продолжить?' };
      }
    } else {
      if (!songDescription.trim() && customStyles.length === 0 && !lyrics.trim()) {
        return { valid: false, error: 'Заполните хотя бы одно поле' };
      }
    }
    return { valid: true };
  }, [generationMode, songDescription, selectedInspirations, isInstrumental, lyrics, customStyles]);

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

    vibrate('heavy');

    try {
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
        
        if (options.length > 0) {
          finalPrompt = `${finalPrompt}\n\n${options.join(', ')}`;
        }
      }

      const shouldIncludeVocals = generationMode === 'simple' ? !isInstrumental : hasVocals;
      const sanitizedLyrics = lyrics.trim();

      // Keep hook state in sync for other consumers
      setHookPrompt(finalPrompt);

      // Call generate with explicit parameters to avoid stale state
      const started = await generateMusic({
        prompt: finalPrompt,
        title: songTitle.trim() || undefined,
        lyrics: shouldIncludeVocals && sanitizedLyrics ? sanitizedLyrics : undefined,
        hasVocals: shouldIncludeVocals,
        styleTags: tags,
        customMode: generationMode === 'custom',
        modelVersion: selectedModel,
      });

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

      if (onTrackGenerated) {
        onTrackGenerated();
      }
    } catch (error) {
      console.error('Error generating music:', error);
      toast({
        title: "❌ Ошибка",
        description: (error as Error).message || "Не удалось начать генерацию",
        variant: "destructive"
      });
    }
  }, [
    generationMode, songDescription, selectedInspirations, customStyles, isInstrumental,
    hasVocals, lyrics, tempo, musicalKey, vocalType, songTitle, selectedModel,
    setHookPrompt, generateMusic, vibrate, validateForm, toast, onTrackGenerated,
    setIsLyricsDialogOpen
  ]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleGenerate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate]);

  return (
    <div className="h-full w-full">
      <Card className="h-full border-border/40 bg-background/95 backdrop-blur-sm shadow-lg flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border/40 bg-muted/20">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-xs px-2 py-1">
                <Music className="h-3 w-3 mr-1" />
                10k Credits
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Tabs value={generationMode} onValueChange={(v) => setGenerationMode(v as 'simple' | 'custom')} className="w-auto">
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

            {/* Quick Styles */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Быстрые стили (опционально)</Label>
              <div className="flex flex-wrap gap-2">
                {quickStyleChips.map((chip) => (
                  <Button
                    key={chip}
                    variant={styleTags.includes(chip) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStyleTag(chip)}
                    className="h-8 text-sm rounded-full px-4 transition-all duration-200"
                    disabled={isGenerating}
                  >
                    {chip}
                  </Button>
                ))}
              </div>
            )}

            {/* Custom Mode */}
            {generationMode === 'custom' && (
              <div className="space-y-4 animate-fade-in">
                {/* Tabs: Audio / Persona / Inspo */}
                <Tabs defaultValue="lyrics" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-9 p-1">
                    <TabsTrigger value="audio" className="text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Audio
                    </TabsTrigger>
                    <TabsTrigger value="persona" className="text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Persona
                    </TabsTrigger>
                    <TabsTrigger value="lyrics" className="text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Inspo
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="audio" className="mt-4">
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Upload audio reference (coming soon)
                    </div>
                  </TabsContent>

            {/* Advanced Options Accordion */}
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="advanced-settings" className="border-t pt-4">
                <AccordionTrigger className="text-base font-medium hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-5 w-5" />
                    Расширенные настройки
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4 space-y-6">
                  {/* Lyrics Section */}
                  <div className="space-y-2">
                    <Label htmlFor="lyrics-input" className="text-base font-medium flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Текст песни
                    </Label>
                    <Textarea
                      id="lyrics-input"
                      placeholder="Добавьте свой текст здесь или оставьте пустым для инструментального трека."
                      value={lyrics}
                      onChange={(e) => setLyrics(e.target.value)}
                      className="min-h-[150px] resize-none bg-background/50 text-base"
                      disabled={isGenerating}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsLyricsDialogOpen(true)}
                      className="mt-2"
                    >
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Открыть в редакторе
                    </Button>
                  </div>

                  {/* Instrumental Toggle */}
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <Label htmlFor="instrumental-switch" className="text-base font-medium">
                        Инструментальный трек
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Создать музыку без вокала.
                      </p>
                    </div>
                    <Switch
                      id="instrumental-switch"
                      checked={isInstrumental}
                      onCheckedChange={setIsInstrumental}
                      disabled={isGenerating}
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>

        {/* Footer with Create Button */}
        <div className="p-4 border-t border-border/40 bg-muted/20 mt-auto">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full h-12 text-lg gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                Создание трека...
              </>
            ) : (
              <>
                <Play className="h-6 w-6" />
                Сгенерировать музыку
              </>
            )}
          </Button>
          <div className="text-xs text-muted-foreground text-center mt-2">
            Или нажмите ⌘/Ctrl + Enter
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
          <div className="p-6 border-t bg-muted/50">
            <Button onClick={() => setIsLyricsDialogOpen(false)}>Закрыть</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const MusicGenerator = memo(MusicGeneratorComponent);