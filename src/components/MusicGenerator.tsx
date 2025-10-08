import { memo, useState, useCallback, useEffect, useRef } from 'react';
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
import { 
  Music, Loader2, Plus, Wand2, Maximize2,
  Music2, FileText, Settings2, Play
} from 'lucide-react';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { LyricsEditor } from '@/components/LyricsEditor';

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
  { value: 'v5', label: 'v5 (Latest)' },
  { value: 'v4.5', label: 'v4.5' },
  { value: 'v4', label: 'v4' },
];

// Vocal options
const vocalTypes = ['Lead Vocal', 'Backing Vocals', 'Duet', 'Choir', 'Rap Verse', 'Spoken Word'];

// Musical keys
const musicalKeys = ['C major', 'C minor', 'D major', 'D minor', 'E major', 'E minor', 'F major', 'F minor', 'G major', 'G minor', 'A major', 'A minor', 'B major', 'B minor'];

const MusicGeneratorComponent = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const {
    generateMusic,
    isGenerating,
    prompt: hookPrompt,
    setPrompt: setHookPrompt,
    improvePrompt: hookImprovePrompt
  } = useMusicGeneration();
  
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Mode & UI State
  const [mode, setMode] = useState<'simple' | 'custom'>('simple');
  const [selectedModel, setSelectedModel] = useState('v5');
  
  // Simple Mode State
  const [songDescription, setSongDescription] = useState('');
  const [selectedInspirations, setSelectedInspirations] = useState<string[]>([]);
  const [isInstrumental, setIsInstrumental] = useState(false);
  
  // Custom Mode State
  const [lyrics, setLyrics] = useState('');
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [songTitle, setSongTitle] = useState('');
  
  // Advanced Options
  const [tempo, setTempo] = useState([120]);
  const [musicalKey, setMusicalKey] = useState('');
  const [hasVocals, setHasVocals] = useState(true);
  const [vocalType, setVocalType] = useState('');
  
  // UI State
  const [isLyricsDialogOpen, setIsLyricsDialogOpen] = useState(false);
  const [isImproving, setIsImproving] = useState(false);

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

  // Enhance prompt with AI
  const handleEnhancePrompt = useCallback(async () => {
    const currentPrompt = mode === 'simple' ? songDescription : lyrics;
    
    if (!currentPrompt.trim()) {
      toast({
        title: "❌ Ошибка",
        description: "Введите описание или текст для улучшения",
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
  }, [mode, songDescription, lyrics, hookPrompt, setHookPrompt, hookImprovePrompt, vibrate, toast]);

  // Validation
  const validateForm = useCallback(() => {
    if (mode === 'simple') {
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
  }, [mode, songDescription, selectedInspirations, isInstrumental, lyrics, customStyles]);

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
    
    if (validation.warning) {
      const confirm = window.confirm(validation.warning);
      if (!confirm) return;
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
        description: "Не удалось начать генерацию",
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
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setIsLyricsDialogOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate]);

  return (
    <div className="h-full w-full">
      <Card className="h-full border-border/40 bg-background/95 backdrop-blur-sm shadow-lg">
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
              <Tabs value={mode} onValueChange={(v) => setMode(v as 'simple' | 'custom')} className="w-auto">
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
            {mode === 'simple' && (
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
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Audio
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => setIsLyricsDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Lyrics
                  </Button>
                  
                  <div className="flex-1" />
                  
                  <Button
                    variant={isInstrumental ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs gap-1"
                    onClick={() => setIsInstrumental(!isInstrumental)}
                  >
                    {isInstrumental && <Music className="h-3 w-3" />}
                    Instrumental
                  </Button>
                </div>

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
            {mode === 'custom' && (
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

                  <TabsContent value="persona" className="mt-4">
                    <div className="text-sm text-muted-foreground text-center py-8">
                      Select vocal persona (coming soon)
                    </div>
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
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle>Lyrics & Tags Editor</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <LyricsEditor
              lyrics={lyrics}
              onLyricsChange={setLyrics}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export const MusicGenerator = memo(MusicGeneratorComponent);