import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TooltipProvider } from '@/components/ui/tooltip';
import { 
  Sparkles, 
  Music, 
  Wand2, 
  Mic, 
  Settings2, 
  FileText, 
  Zap, 
  X,
  Play,
  Volume2,
  Clock,
  Music2
} from 'lucide-react';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { withErrorBoundary } from '@/components/ui/error-boundary';
import { LyricsEditor } from '@/components/LyricsEditor';

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

const MusicGeneratorComponent = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const {
    prompt,
    setPrompt,
    isGenerating,
    isImproving,
    provider,
    setProvider,
    hasVocals,
    setHasVocals,
    lyrics,
    setLyrics,
    styleTags,
    setStyleTags,
    generateMusic,
    improvePrompt
  } = useMusicGeneration();
  
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();
  const [mood, setMood] = useState("");
  const [tempo, setTempo] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Intersection Observer для анимации появления
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Автоматическое изменение размера textarea
  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [prompt, adjustTextareaHeight]);

  // Quick style suggestions
  const quickStyles = useMemo(() => [
    { name: "Поп", icon: "🎵", gradient: "from-pink-500 to-purple-500" },
    { name: "Рок", icon: "🎸", gradient: "from-red-500 to-orange-500" },
    { name: "Электроника", icon: "🎛️", gradient: "from-cyan-500 to-blue-500" },
    { name: "Джаз", icon: "🎺", gradient: "from-amber-500 to-yellow-500" },
    { name: "Хип-хоп", icon: "🎤", gradient: "from-purple-500 to-pink-500" },
    { name: "Классика", icon: "🎼", gradient: "from-blue-500 to-indigo-500" },
  ], []);

  // Настройки настроения
  const moodOptions = useMemo(() => [
    { value: "energetic", label: "Энергичное", icon: "⚡", color: "text-yellow-500" },
    { value: "calm", label: "Спокойное", icon: "🌙", color: "text-blue-500" },
    { value: "happy", label: "Радостное", icon: "☀️", color: "text-orange-500" },
    { value: "melancholic", label: "Меланхоличное", icon: "🌧️", color: "text-gray-500" },
    { value: "mysterious", label: "Загадочное", icon: "🌟", color: "text-purple-500" },
  ], []);

  // Настройки темпа
  const tempoOptions = useMemo(() => [
    { value: "slow", label: "Медленный", bpm: "60-80", icon: "🐌" },
    { value: "medium", label: "Средний", bpm: "80-120", icon: "🚶" },
    { value: "fast", label: "Быстрый", bpm: "120-140", icon: "🏃" },
    { value: "very-fast", label: "Очень быстрый", bpm: "140+", icon: "⚡" },
  ], []);

  const toggleTag = useCallback((tag: string) => {
    setStyleTags(prev =>
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
    vibrate('light');
  }, [setStyleTags, vibrate]);

  const handleGenerateMusic = useCallback(async () => {
    vibrate('medium');
    
    try {
      toast({
        title: "🎵 Генерация началась",
        description: "Создаём вашу музыку с помощью AI...",
      });
      
      await generateMusic();
      
      toast({
        title: "✨ Музыка создана!",
        description: "Ваш трек успешно сгенерирован и готов к прослушиванию.",
      });
      
      if (onTrackGenerated) {
        onTrackGenerated();
      }
    } catch (error) {
      toast({
        title: "❌ Ошибка генерации",
        description: "Не удалось создать музыку. Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  }, [generateMusic, vibrate, toast, onTrackGenerated]);

  const handleImprovePrompt = useCallback(async () => {
    vibrate('light');
    
    try {
      toast({
        title: "🪄 Улучшение промпта",
        description: "AI анализирует и улучшает ваше описание...",
      });
      
      await improvePrompt();
      
      toast({
        title: "✅ Промпт улучшен!",
        description: "Описание музыки было оптимизировано для лучшего результата.",
      });
    } catch (error) {
      toast({
        title: "❌ Ошибка улучшения",
        description: "Не удалось улучшить промпт. Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  }, [improvePrompt, vibrate, toast]);

  return (
    <TooltipProvider delayDuration={300}>
    <div 
      ref={cardRef}
      className={`
        relative w-full h-full overflow-hidden
        transition-all duration-700 ease-out
        ${isVisible ? 'animate-fade-in opacity-100' : 'opacity-0'}
      `}
    >
      {/* Декоративный фон с градиентами */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent/20 via-accent/5 to-transparent rounded-full blur-3xl animate-pulse-glow" style={{ animationDelay: '1s' }} />
      </div>

      <Card 
        className="
          relative z-10 h-full overflow-y-auto scrollbar-styled
          bg-gradient-to-br from-background/95 via-background/90 to-background/95 
          backdrop-blur-2xl border-primary/20 shadow-2xl
          p-4 sm:p-6 lg:p-8
        "
      >
        {/* Header */}
        <div className="space-y-4 mb-6 lg:mb-8">
          <div className="flex items-start gap-4">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-primary opacity-75 rounded-2xl blur-lg group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative p-3 lg:p-4 rounded-xl bg-gradient-primary shadow-glow shrink-0">
                <Music className="h-7 w-7 lg:h-8 lg:w-8 text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
                Создайте свою музыку с AI
              </h2>
              <p className="text-muted-foreground text-sm sm:text-base mt-2 leading-relaxed">
                Профессиональная генерация музыки с вокалом и лирикой
              </p>
            </div>
          </div>

          {/* Mode Tabs */}
          <Tabs defaultValue="simple" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/30 backdrop-blur-sm border border-primary/10 rounded-xl">
              <TabsTrigger 
                value="simple" 
                className="
                  data-[state=active]:bg-gradient-primary data-[state=active]:text-white
                  data-[state=active]:shadow-glow-primary
                  transition-all duration-300 rounded-lg py-3 px-4
                  hover:bg-primary/10
                "
              >
                <Zap className="w-4 h-4 mr-2" />
                <span className="font-medium">Простой режим</span>
              </TabsTrigger>
              <TabsTrigger 
                value="advanced"
                className="
                  data-[state=active]:bg-gradient-primary data-[state=active]:text-white
                  data-[state=active]:shadow-glow-primary
                  transition-all duration-300 rounded-lg py-3 px-4
                  hover:bg-primary/10
                "
              >
                <Settings2 className="w-4 h-4 mr-2" />
                <span className="font-medium">Расширенный</span>
              </TabsTrigger>
            </TabsList>

            {/* Simple Mode */}
            <TabsContent value="simple" className="space-y-6 mt-6 animate-fade-in">
              {/* AI Provider Selection */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-muted/20 to-muted/10 border border-primary/10">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    Провайдер AI
                  </Label>
                  <Badge variant="secondary" className="text-xs px-2 py-0.5">
                    {provider === 'suno' ? 'Рекомендуется' : 'Альтернатива'}
                  </Badge>
                </div>
                <Select 
                  value={provider} 
                  onValueChange={(value) => setProvider(value as 'suno' | 'replicate')} 
                  disabled={isGenerating}
                >
                  <SelectTrigger className="h-12 bg-background/50 border-primary/20 hover:border-primary/40 transition-all">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="z-[70]">
                    <SelectItem value="suno" className="cursor-pointer">
                      <div className="flex items-center gap-3 py-1">
                        <Music2 className="h-5 w-5 text-primary" />
                        <div>
                          <div className="font-medium">Suno AI</div>
                          <div className="text-xs text-muted-foreground">Рекомендуется для вокала</div>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Main Prompt */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Описание музыки
                </Label>
                <div className="relative group">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Опишите желаемый стиль, инструменты, настроение... Например: Энергичный электронный трек с глубоким басом и атмосферными синтезаторами"
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      adjustTextareaHeight();
                    }}
                    className="
                      min-h-[120px] resize-none
                      bg-background/50 backdrop-blur-sm 
                      border-primary/20 hover:border-primary/40 focus:border-primary/60
                      transition-all duration-300
                      text-base leading-relaxed
                      group-hover:shadow-lg
                    "
                    disabled={isGenerating || isImproving}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                    {prompt.length} символов
                  </div>
                </div>
              </div>

              {/* Style Tags */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  Жанры и стили
                </Label>
                <div className="flex flex-wrap gap-2">
                  {quickStyles.map((style) => {
                    const isSelected = styleTags.includes(style.name);
                    return (
                      <button
                        key={style.name}
                        onClick={() => toggleTag(style.name)}
                        className={`
                          group relative overflow-hidden
                          px-4 py-2.5 rounded-xl
                          font-medium text-sm
                          transition-all duration-300
                          hover:scale-105 hover:shadow-lg
                          active:scale-95
                          ${isSelected 
                            ? `bg-gradient-to-r ${style.gradient} text-white shadow-glow-primary` 
                            : 'bg-muted/30 hover:bg-muted/50 border border-primary/20 hover:border-primary/40'
                          }
                        `}
                      >
                        <span className="relative z-10 flex items-center gap-2">
                          <span className="text-lg">{style.icon}</span>
                          <span>{style.name}</span>
                        </span>
                        {!isSelected && (
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        )}
                      </button>
                    );
                  })}
                </div>
                {styleTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                    <span className="text-xs font-medium text-muted-foreground">Выбрано:</span>
                    {styleTags.map(tag => (
                      <Badge 
                        key={tag} 
                        variant="secondary" 
                        className="gap-1.5 px-3 py-1 hover:bg-destructive/20 transition-colors cursor-pointer"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                        <X className="h-3 w-3" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Mood & Tempo Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Mood */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-primary" />
                    Настроение
                  </Label>
                  <Select value={mood} onValueChange={setMood} disabled={isGenerating}>
                    <SelectTrigger className="h-12 bg-background/50 border-primary/20 hover:border-primary/40 transition-all">
                      <SelectValue placeholder="Выберите настроение" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {moodOptions.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="cursor-pointer py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{option.icon}</span>
                            <span className={`font-medium ${option.color}`}>{option.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tempo */}
                <div className="space-y-3">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />
                    Темп
                  </Label>
                  <Select value={tempo} onValueChange={setTempo} disabled={isGenerating}>
                    <SelectTrigger className="h-12 bg-background/50 border-primary/20 hover:border-primary/40 transition-all">
                      <SelectValue placeholder="Выберите темп" />
                    </SelectTrigger>
                    <SelectContent className="z-[70]">
                      {tempoOptions.map((option) => (
                        <SelectItem 
                          key={option.value} 
                          value={option.value}
                          className="cursor-pointer py-3"
                        >
                          <div className="flex items-center justify-between w-full gap-3">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{option.icon}</span>
                              <span className="font-medium">{option.label}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{option.bpm} BPM</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Vocals Toggle */}
              <div className="group relative overflow-hidden rounded-xl border border-primary/20 hover:border-primary/40 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2.5 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                      <Mic className="h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                    <div>
                      <Label htmlFor="vocals-switch" className="text-sm font-semibold cursor-pointer">
                        Расширенный вокал
                      </Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Настройка лирики и вокального стиля
                      </p>
                    </div>
                  </div>
                  <Switch
                    id="vocals-switch"
                    checked={hasVocals}
                    onCheckedChange={(checked) => {
                      setHasVocals(checked);
                      vibrate('light');
                    }}
                    disabled={isGenerating || isImproving}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleImprovePrompt}
                  disabled={isImproving || isGenerating || !prompt.trim()}
                  className="
                    h-12 group relative overflow-hidden
                    border-primary/30 hover:border-primary/60
                    hover:bg-primary/5 hover:scale-105
                    transition-all duration-300
                  "
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  <Wand2 className="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
                  {isImproving ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      <span>Улучшение...</span>
                    </div>
                  ) : (
                    <span>Улучшить с AI</span>
                  )}
                </Button>

                <Button
                  onClick={handleGenerateMusic}
                  disabled={isGenerating || !prompt.trim()}
                  className="
                    h-12 group relative overflow-hidden
                    bg-gradient-primary hover:opacity-90
                    shadow-glow-primary hover:shadow-glow-accent
                    hover:scale-105
                    transition-all duration-300
                  "
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span className="font-semibold">Генерация...</span>
                    </div>
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                      <span className="font-semibold">Создать музыку</span>
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Advanced Mode */}
            <TabsContent value="advanced" className="space-y-6 mt-6 animate-fade-in">
              <LyricsEditor lyrics={lyrics} onLyricsChange={setLyrics} />

              {/* Generate Button */}
              <Button
                onClick={handleGenerateMusic}
                disabled={isGenerating || !prompt.trim()}
                className="
                  w-full h-14 group relative overflow-hidden
                  bg-gradient-primary hover:opacity-90
                  shadow-glow-primary hover:shadow-glow-accent
                  hover:scale-105
                  transition-all duration-300
                  text-lg font-bold
                "
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
                {isGenerating ? (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Генерация в процессе...</span>
                  </div>
                ) : (
                  <>
                    <Sparkles className="mr-3 h-6 w-6 group-hover:rotate-12 transition-transform" />
                    <span>Создать музыку с расширенными настройками</span>
                  </>
                )}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
    </TooltipProvider>
  );
};

export const MusicGenerator = withErrorBoundary(memo(MusicGeneratorComponent));
