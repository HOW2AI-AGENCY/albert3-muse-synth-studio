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
import { LyricsEditor } from '@/components/LyricsEditor';

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

  // Unified State for Generation
  const [prompt, setPrompt] = useState('');
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const [lyrics, setLyrics] = useState('');
  const [isInstrumental, setIsInstrumental] = useState(false);
  
  // UI State
  const [isLyricsDialogOpen, setIsLyricsDialogOpen] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

  // Toggle style tags
  const toggleStyleTag = useCallback((tag: string) => {
    vibrate('light');
    setStyleTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, [vibrate]);
  
  // Enhance prompt with AI
  const handleEnhancePrompt = useCallback(async () => {
    if (!prompt.trim()) {
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
        if (mode === 'simple') {
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
  }, [mode, songDescription, lyrics, setHookPrompt, hookImprovePrompt, vibrate, toast]);

  // Validation
  const validateForm = useCallback(() => {
    if (!prompt.trim() && styleTags.length === 0) {
      return { valid: false, error: 'Введите описание или выберите стиль музыки' };
    }
    return { valid: true };
  }, [prompt, styleTags]);

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
      let finalPrompt = songDescription;
      const tags = mode === 'simple' ? selectedInspirations : customStyles;
      
      if (tags.length > 0) {
        finalPrompt = `${finalPrompt}\n\nStyles: ${tags.join(', ')}`;
      }
      
      if (mode === 'custom') {
        const options: string[] = [];
        if (tempo[0] !== 120) options.push(`Tempo: ${tempo[0]} BPM`);
        if (musicalKey) options.push(`Key: ${musicalKey}`);
        if (vocalType) options.push(`Vocal: ${vocalType}`);
        
        if (options.length > 0) {
          finalPrompt = `${finalPrompt}\n\n${options.join(', ')}`;
        }
      }

      const shouldIncludeVocals = mode === 'simple' ? !isInstrumental : hasVocals;
      const sanitizedLyrics = lyrics.trim();

      // Keep hook state in sync for other consumers
      setHookPrompt(finalPrompt);

      // Call generate with explicit parameters to avoid stale state
      await generateMusic({
        prompt: finalPrompt,
        title: songTitle.trim() || undefined,
        lyrics: shouldIncludeVocals && sanitizedLyrics ? sanitizedLyrics : undefined,
        hasVocals: shouldIncludeVocals,
        styleTags: tags,
        customMode: mode === 'custom'
      });

      toast({
        title: "🎵 Генерация началась!",
        description: "Создаём вашу музыку..."
      });
      
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
    mode, songDescription, selectedInspirations, customStyles, isInstrumental,
    hasVocals, lyrics, tempo, musicalKey, vocalType, songTitle, setHookPrompt,
    generateMusic, vibrate, validateForm, toast, onTrackGenerated
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
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Music className="h-5 w-5" />
            Создайте свою музыку с AI
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Опишите желаемую музыку, и наш AI создаст уникальный трек.
          </p>
        </div>

        <ScrollArea ref={scrollRef} className="flex-1">
          <div className="p-4 space-y-6">
            {/* Main Prompt */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="main-prompt" className="text-base font-medium">Опишите вашу музыку</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEnhancePrompt}
                  disabled={isImproving || !prompt}
                  className="h-8 text-xs gap-1.5"
                >
                  {isImproving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  Улучшить с AI
                </Button>
              </div>
              <Textarea
                id="main-prompt"
                placeholder="Пример: Энергичный электронный трек в стиле 80-х, с мощной басовой линией и меланхоличной мелодией синтезатора..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none bg-background/50 text-base"
                disabled={isGenerating}
                rows={5}
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
            </div>

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
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Редактор текста</DialogTitle>
          </DialogHeader>
          <div className="flex-1 px-6 overflow-hidden">
            <LyricsEditor
              lyrics={lyrics}
              onLyricsChange={setLyrics}
            />
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