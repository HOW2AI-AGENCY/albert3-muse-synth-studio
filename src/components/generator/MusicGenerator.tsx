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
import { Loader2, Music, Sparkles, Upload, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useProviderBalance } from '@/hooks/useProviderBalance';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

type GeneratorMode = 'simple' | 'custom';

const SUNO_MODELS = [
  { value: 'V5', label: 'V5 (Latest)', description: 'Новейшая модель' },
  { value: 'V4_5PLUS', label: 'V4.5 Plus', description: 'Улучшенная V4.5' },
  { value: 'V4_5', label: 'V4.5', description: 'Стабильная версия' },
  { value: 'V4', label: 'V4', description: 'Проверенная версия' },
] as const;

export const MusicGenerator = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const { toast } = useToast();
  const { balance, isLoading: balanceLoading } = useProviderBalance();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [mode, setMode] = useState<GeneratorMode>('simple');
  const [modelVersion, setModelVersion] = useState('V5');

  // Simple mode
  const [prompt, setPrompt] = useState('');

  // Custom mode
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [tags, setTags] = useState('');

  // Quick actions
  const [hasAudio, setHasAudio] = useState(false);
  const [hasPersona, setHasPersona] = useState(false);
  const [hasInspo, setHasInspo] = useState(false);

  const handleModeChange = useCallback((newMode: GeneratorMode) => {
    if (newMode === 'simple' && (hasAudio || hasPersona)) {
      const confirmed = window.confirm(
        'Переключение на Simple Mode скроет настройки Audio и Persona. Продолжить?'
      );
      if (!confirmed) return;
    }
    setMode(newMode);
  }, [hasAudio, hasPersona]);

  const handleGenerate = async () => {
    if (!prompt.trim() && !title.trim()) {
      toast({
        title: "Ошибка",
        description: "Заполните описание музыки",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const payload = mode === 'simple' 
        ? {
            prompt: prompt.trim(),
            modelVersion,
          }
        : {
            prompt: prompt.trim() || title.trim(),
            title: title.trim(),
            lyrics: lyrics.trim(),
            tags: tags.trim(),
            customMode: true,
            modelVersion,
          };

      const { error } = await supabase.functions.invoke('generate-suno', {
        body: payload,
      });

      if (error) throw error;

      toast({
        title: "Генерация началась",
        description: "Ваш трек создаётся, это займёт 1-2 минуты",
      });

      // Reset form
      setPrompt('');
      setTitle('');
      setLyrics('');
      setTags('');

      if (onTrackGenerated) {
        onTrackGenerated();
      }
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Ошибка генерации",
        description: error instanceof Error ? error.message : "Попробуйте ещё раз",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const advancedResourcesCount = [hasAudio, hasPersona].filter(Boolean).length;

  return (
    <Card className="h-full border-0 shadow-none">
      <CardContent className="p-0 space-y-0">
        {/* Header with Balance */}
        <div className="px-4 py-3 border-b bg-card/50 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Создать музыку</h3>
            </div>
            
            {/* Balance Display */}
            <div className="flex items-center gap-2">
              {balanceLoading ? (
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
              ) : balance ? (
                <Badge variant="secondary" className="text-xs">
                  {balance.balance} кредитов
                </Badge>
              ) : null}
            </div>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-3">
            <Label className="text-xs text-muted-foreground shrink-0">Режим:</Label>
            <RadioGroup
              value={mode}
              onValueChange={(v) => handleModeChange(v as GeneratorMode)}
              className="flex gap-3"
              disabled={isGenerating}
            >
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
                  {advancedResourcesCount > 0 && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                      {advancedResourcesCount}
                    </Badge>
                  )}
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
                {SUNO_MODELS.map((model) => (
                  <SelectItem key={model.value} value={model.value} className="text-xs">
                    <div className="flex flex-col">
                      <span>{model.label}</span>
                      <span className="text-[10px] text-muted-foreground">{model.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Actions Bar */}
        <div className="grid grid-cols-3 gap-2 px-3 py-2 border-b bg-background/95">
          <TooltipProvider>
            {/* Audio Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hasAudio ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHasAudio(!hasAudio)}
                  disabled={isGenerating || mode === 'simple'}
                  className={cn(
                    "h-8 text-xs gap-1.5",
                    hasAudio && "bg-primary text-primary-foreground"
                  )}
                >
                  <Upload className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Аудио</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Загрузить референсное аудио</p>
              </TooltipContent>
            </Tooltip>

            {/* Persona Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hasPersona ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHasPersona(!hasPersona)}
                  disabled={isGenerating || mode === 'simple'}
                  className={cn(
                    "h-8 text-xs gap-1.5",
                    hasPersona && "bg-primary text-primary-foreground"
                  )}
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Персона</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                <p>Выбрать голосовую персону</p>
              </TooltipContent>
            </Tooltip>

            {/* Inspo Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={hasInspo ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHasInspo(!hasInspo)}
                  disabled={isGenerating}
                  className={cn(
                    "h-8 text-xs gap-1.5",
                    hasInspo && "bg-primary text-primary-foreground"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Проект</span>
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
          {mode === 'simple' ? (
            // Simple Mode
            <>
              <div className="space-y-2">
                <Label className="text-sm">Опишите музыку</Label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Энергичная электронная музыка для тренировки"
                  className="min-h-[120px] resize-none"
                  disabled={isGenerating}
                />
              </div>
            </>
          ) : (
            // Custom Mode
            <>
              <div className="space-y-2">
                <Label className="text-sm">Название</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Моя песня"
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Текст песни</Label>
                <Textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="[Verse]&#10;Текст первого куплета...&#10;&#10;[Chorus]&#10;Текст припева..."
                  className="min-h-[150px] font-mono text-sm resize-none"
                  disabled={isGenerating}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm">Теги стилей</Label>
                <Input
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="pop, energetic, female vocals"
                  disabled={isGenerating}
                />
              </div>
            </>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Создать музыку
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
