import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Sparkles, Upload, User, History, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProviderBalance } from '@/hooks/useProviderBalance';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { PromptHistoryDialog } from '@/components/generator/PromptHistoryDialog';
import { PersonaPickerDialog } from '@/components/generator/PersonaPickerDialog';
import { InspoProjectDialog, type InspoProject } from '@/components/generator/InspoProjectDialog';
import { LazyAudioSourceDialog } from '@/components/LazyDialogs';
import { StyleRecommendationsInline } from '@/components/generator/StyleRecommendationsInline';
interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}
type GeneratorMode = 'simple' | 'custom';
const SUNO_MODELS = [{
  value: 'V5',
  label: 'V5 (Latest)',
  description: 'Новейшая модель'
}, {
  value: 'V4_5PLUS',
  label: 'V4.5 Plus',
  description: 'Улучшенная V4.5'
}, {
  value: 'V4_5',
  label: 'V4.5',
  description: 'Стабильная версия'
}, {
  value: 'V4',
  label: 'V4',
  description: 'Проверенная версия'
}] as const;
export const MusicGenerator = ({
  onTrackGenerated
}: MusicGeneratorProps) => {
  const {
    toast
  } = useToast();
  const {
    balance,
    isLoading: balanceLoading
  } = useProviderBalance();
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<GeneratorMode>('simple');
  const [modelVersion, setModelVersion] = useState('V5');

  // Simple mode
  const [prompt, setPrompt] = useState('');

  // Custom mode
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tags, setTags] = useState('');

  // Quick actions states
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string | null>(null);
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedProjectName, setSelectedProjectName] = useState<string | null>(null);

  // Dialog states
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [audioSourceDialogOpen, setAudioSourceDialogOpen] = useState(false);
  const [personaDialogOpen, setPersonaDialogOpen] = useState(false);
  const [inspoDialogOpen, setInspoDialogOpen] = useState(false);

  // Computed states
  const hasAudio = !!referenceAudioUrl;
  const hasPersona = !!selectedPersonaId;
  const hasInspo = !!selectedProjectId;
  const handleModeChange = useCallback((newMode: GeneratorMode) => {
    if (newMode === 'simple' && (hasAudio || hasPersona || hasInspo)) {
      const confirmed = window.confirm('Переключение на Simple Mode очистит Audio, Persona и Project. Продолжить?');
      if (!confirmed) return;

      // Clear all advanced resources
      setReferenceAudioUrl(null);
      setReferenceFileName(null);
      setSelectedPersonaId(null);
      setSelectedProjectId(null);
      setSelectedProjectName(null);
    }
    setMode(newMode);
  }, [hasAudio, hasPersona, hasInspo]);

  // Auto-switch to Custom Mode when advanced resources are selected
  const switchToCustomMode = useCallback(() => {
    if (mode === 'simple') {
      setMode('custom');
      toast({
        title: "Переключено в Custom Mode",
        description: "Для использования расширенных функций",
        duration: 2000
      });
    }
  }, [mode, toast]);

  // Audio handlers
  const handleAudioClick = useCallback(() => {
    switchToCustomMode();
    setAudioSourceDialogOpen(true);
  }, [switchToCustomMode]);
  const handleAudioSelect = useCallback((url: string, fileName: string) => {
    setReferenceAudioUrl(url);
    setReferenceFileName(fileName);
    setAudioSourceDialogOpen(false);
    toast({
      title: "Референс добавлен",
      description: fileName
    });
  }, [toast]);
  const handleRemoveAudio = useCallback(() => {
    setReferenceAudioUrl(null);
    setReferenceFileName(null);
  }, []);

  // Persona handlers
  const handlePersonaClick = useCallback(() => {
    switchToCustomMode();
    setPersonaDialogOpen(true);
  }, [switchToCustomMode]);
  const handleSelectPersona = useCallback((personaId: string | null) => {
    setSelectedPersonaId(personaId);
    setPersonaDialogOpen(false);
    if (personaId) {
      toast({
        title: "Персона выбрана",
        description: "Голос будет применён к треку"
      });
    }
  }, [toast]);

  // Project handlers
  const handleInspoClick = useCallback(() => {
    switchToCustomMode();
    setInspoDialogOpen(true);
  }, [switchToCustomMode]);
  const handleSelectInspo = useCallback((project: InspoProject) => {
    setSelectedProjectId(project.id);
    setSelectedProjectName(project.name);

    // Apply project tags to form
    if (project.style_tags?.length > 0) {
      const newTags = project.style_tags.join(', ');
      setTags(newTags);
    }
    setInspoDialogOpen(false);
    toast({
      title: "Проект выбран",
      description: project.name
    });
  }, [toast]);

  // History handlers
  const handleHistorySelect = useCallback((item: any) => {
    if (item.prompt) setPrompt(item.prompt);
    if (item.lyrics) setLyrics(item.lyrics);
    if (item.style_tags?.length) setTags(item.style_tags.join(', '));
    setHistoryDialogOpen(false);
  }, []);

  // Style improvement
  const handleApplyTags = useCallback((newTags: string[]) => {
    const existingTags = tags.split(',').map(t => t.trim()).filter(Boolean);
    const combined = [...new Set([...existingTags, ...newTags])];
    setTags(combined.join(', '));
  }, [tags]);
  const handleAdvancedPromptGenerated = useCallback((result: {
    enhancedPrompt: string;
    metaTags?: string[];
  }) => {
    setPrompt(result.enhancedPrompt);
    if (result.metaTags && result.metaTags.length > 0) {
      const existingTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const combined = [...new Set([...existingTags, ...result.metaTags])];
      setTags(combined.join(', '));
    }
    toast({
      title: "Промпт улучшен",
      description: "Применён расширенный промпт с AI рекомендациями"
    });
  }, [toast, tags]);

  // Boost prompt handler
  const handleBoostPrompt = useCallback(async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('improve-prompt', {
        body: {
          prompt: prompt.trim()
        }
      });
      if (error) throw error;
      if (data?.improvedPrompt) {
        setPrompt(data.improvedPrompt);
        toast({
          title: "Промпт улучшен",
          description: "AI расширил описание музыки"
        });
      }
    } catch (error) {
      console.error('Boost prompt error:', error);
      toast({
        title: "Ошибка улучшения",
        description: error instanceof Error ? error.message : "Попробуйте ещё раз",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, toast]);
  const handleGenerate = async () => {
    if (!prompt.trim() && !title.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните описание музыки",
        variant: "destructive"
      });
      return;
    }
    setIsGenerating(true);
    try {
      const payload = mode === 'simple' ? {
        prompt: prompt.trim(),
        modelVersion
      } : {
        prompt: prompt.trim() || title.trim(),
        title: title.trim(),
        lyrics: lyrics.trim(),
        tags: tags.trim(),
        customMode: true,
        modelVersion,
        referenceAudioUrl: referenceAudioUrl || undefined,
        personaId: selectedPersonaId || undefined,
        inspoProjectId: selectedProjectId || undefined
      };
      
      // Save to history after successful generation start
      const styleTags = tags.split(',').map(t => t.trim()).filter(Boolean);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          await supabase.from('prompt_history').insert({
            user_id: user.id,
            prompt: prompt.trim() || title.trim(),
            lyrics: lyrics.trim() || null,
            style_tags: styleTags.length > 0 ? styleTags : null,
            provider: 'suno',
          });
        } catch (historyErr) {
          console.error('Failed to save prompt history:', historyErr);
        }
      }
      const {
        error
      } = await supabase.functions.invoke('generate-suno', {
        body: payload
      });
      if (error) throw error;
      toast({
        title: "Генерация началась",
        description: "Ваш трек создаётся, это займёт 1-2 минуты"
      });

      // Reset form
      setPrompt('');
      setTitle('');
      setLyrics('');
      setTags('');
      setReferenceAudioUrl(null);
      setReferenceFileName(null);
      setSelectedPersonaId(null);
      setSelectedProjectId(null);
      setSelectedProjectName(null);
      if (onTrackGenerated) {
        onTrackGenerated();
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Ошибка генерации",
        description: error instanceof Error ? error.message : "Попробуйте ещё раз",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  const advancedResourcesCount = [hasAudio, hasPersona, hasInspo].filter(Boolean).length;
  return <Card className="h-full border-0 shadow-none">
      <CardContent className="p-0 space-y-0">
        {/* Header with Balance */}
        <div className="px-4 py-3 border-b bg-card/50 space-y-3">
          <div className="flex items-center justify-between">
            
            
            {/* Balance Display */}
            <div className="flex items-center gap-2">
              {balanceLoading ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : balance ? <Badge variant="secondary" className="text-xs">
                  {balance.balance} кредитов
                </Badge> : null}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Режим:</Label>
            <RadioGroup value={mode} onValueChange={v => handleModeChange(v as GeneratorMode)} className="flex gap-3" disabled={isGenerating}>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="simple" id="simple" className="h-3.5 w-3.5" />
                <Label htmlFor="simple" className="text-xs cursor-pointer">
                  Simple
                </Label>
              </div>
              <div className="flex items-center gap-1.5">
                <RadioGroupItem value="custom" id="custom" className="h-3.5 w-3.5" />
                <Label htmlFor="custom" className="text-xs cursor-pointer flex items-center gap-1">
                  Custom
                  {advancedResourcesCount > 0 && <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {advancedResourcesCount}
                    </Badge>}
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Model Selector */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Модель:</Label>
            <Select value={modelVersion} onValueChange={setModelVersion} disabled={isGenerating}>
              <SelectTrigger className="h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUNO_MODELS.map(model => <SelectItem key={model.value} value={model.value} className="text-xs">
                    <div className="flex flex-col">
                      <span>{model.label}</span>
                      <span className="text-[10px] text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b bg-background/95">
          <TooltipProvider>
            {/* History Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={() => setHistoryDialogOpen(true)} disabled={isGenerating} className="h-8 text-xs gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">История</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Открыть историю промптов</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex-1" />

            {/* Audio Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={hasAudio ? "default" : "outline"} size="sm" onClick={handleAudioClick} disabled={isGenerating} className={cn("h-8 text-xs gap-1.5", hasAudio && "bg-primary text-primary-foreground")}>
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">+ Аудио</span>
                  <span className="sm:hidden">+</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Загрузить/записать/выбрать референс</p>
              </TooltipContent>
            </Tooltip>

            {/* Persona Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={hasPersona ? "default" : "outline"} size="sm" onClick={handlePersonaClick} disabled={isGenerating} className={cn("h-8 text-xs gap-1.5", hasPersona && "bg-primary text-primary-foreground")}>
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">+ Персона</span>
                  <span className="sm:hidden">+</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Выбрать голосовую персону</p>
              </TooltipContent>
            </Tooltip>

            {/* Project Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant={hasInspo ? "default" : "outline"} size="sm" onClick={handleInspoClick} disabled={isGenerating} className={cn("h-8 text-xs gap-1.5", hasInspo && "bg-primary text-primary-foreground")}>
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">+ Проект</span>
                  <span className="sm:hidden">+</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Выбрать проект для вдохновения</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Form Content */}
        <div className="p-4 space-y-4">
          {mode === 'simple' ?
        // Simple Mode
        <>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Опишите музыку</Label>
                  {prompt.trim().length > 10 && <Button variant="ghost" size="sm" onClick={handleBoostPrompt} disabled={isGenerating} className="h-6 text-xs gap-1">
                      <Wand2 className="h-3 w-3" />
                      Улучшить
                    </Button>}
                </div>
                <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Энергичная электронная музыка для тренировки" className="min-h-[120px] resize-none" disabled={isGenerating} />
              </div>

              {/* Style Recommendations */}
              {prompt.trim().length > 10 && <StyleRecommendationsInline prompt={prompt} currentTags={tags.split(',').map(t => t.trim()).filter(Boolean)} onApplyTags={handleApplyTags} onAdvancedPromptGenerated={handleAdvancedPromptGenerated} />}
            </> :
        // Custom Mode
        <>
              {/* Reference Audio Badge */}
              {hasAudio && <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Upload className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-foreground/80">{referenceFileName}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleRemoveAudio} className="h-6 px-2 text-xs">
                    Удалить
                  </Button>
                </div>}

              {/* Persona Badge */}
              {hasPersona && <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <User className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-foreground/80">Персона выбрана</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPersonaId(null)} className="h-6 px-2 text-xs">
                    Удалить
                  </Button>
                </div>}

              {/* Project Badge */}
              {hasInspo && selectedProjectName && <div className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs text-foreground/80">{selectedProjectName}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {
              setSelectedProjectId(null);
              setSelectedProjectName(null);
            }} className="h-6 px-2 text-xs">
                    Удалить
                  </Button>
                </div>}

              <div className="space-y-2">
                <Label className="text-sm">Название</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Моя песня" disabled={isGenerating} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Текст песни</Label>
                <Textarea value={lyrics} onChange={e => setLyrics(e.target.value)} placeholder="[Verse]&#10;Текст первого куплета...&#10;&#10;[Chorus]&#10;Текст припева..." className="min-h-[150px] font-mono text-sm resize-none" disabled={isGenerating} />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Теги стилей</Label>
                <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="pop, energetic, female vocals" disabled={isGenerating} />
              </div>
            </>}

          <Button onClick={handleGenerate} disabled={isGenerating} className="w-full" size="lg">
            {isGenerating ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация...
              </> : <>
                <Sparkles className="mr-2 h-4 w-4" />
                Создать музыку
              </>}
          </Button>
        </div>

        {/* Dialogs */}
        <PromptHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} onSelect={handleHistorySelect} />

        {audioSourceDialogOpen && <LazyAudioSourceDialog open={audioSourceDialogOpen} onOpenChange={setAudioSourceDialogOpen} onAudioSelect={handleAudioSelect} onRecordComplete={(_blob, url) => {
        setReferenceAudioUrl(url);
        setReferenceFileName('Запись.mp3');
        setAudioSourceDialogOpen(false);
      }} onTrackSelect={track => {
        if (track.audio_url) {
          setReferenceAudioUrl(track.audio_url);
          setReferenceFileName(track.title || 'Выбранный трек');
        }
        if (track.style_tags?.length) {
          const newTags = track.style_tags.join(', ');
          setTags(newTags);
        }
      }} />}

        <PersonaPickerDialog open={personaDialogOpen} onOpenChange={setPersonaDialogOpen} selectedPersonaId={selectedPersonaId} onSelectPersona={handleSelectPersona} />

        <InspoProjectDialog open={inspoDialogOpen} onOpenChange={setInspoDialogOpen} selectedProjectId={selectedProjectId} onSelectProject={handleSelectInspo} />
      </CardContent>
    </Card>;
};