import React, { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Music, Wand2, Mic, Settings2, Hash, FileText, Volume2, Clock, Zap } from 'lucide-react';
import { useMusicGeneration } from '@/hooks/useMusicGeneration';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
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

  // Популярные жанры с анимированными иконками
  const popularGenres = useMemo(() => [
    { name: "Поп", icon: "🎵", gradient: "from-pink-500 to-purple-500" },
    { name: "Рок", icon: "🎸", gradient: "from-red-500 to-orange-500" },
    { name: "Электроника", icon: "🎛️", gradient: "from-blue-500 to-cyan-500" },
    { name: "Джаз", icon: "🎺", gradient: "from-yellow-500 to-amber-500" },
    { name: "Хип-хоп", icon: "🎤", gradient: "from-purple-500 to-indigo-500" },
    { name: "Классика", icon: "🎼", gradient: "from-emerald-500 to-teal-500" },
  ], []);

  // Настройки настроения
  const moodOptions = useMemo(() => [
    { value: "energetic", label: "Энергичное", icon: "⚡" },
    { value: "calm", label: "Спокойное", icon: "🌙" },
    { value: "happy", label: "Радостное", icon: "☀️" },
    { value: "melancholic", label: "Меланхоличное", icon: "🌧️" },
    { value: "mysterious", label: "Загадочное", icon: "🌟" },
  ], []);

  // Настройки темпа
  const tempoOptions = useMemo(() => [
    { value: "slow", label: "Медленный", bpm: "60-80", icon: "🐌" },
    { value: "medium", label: "Средний", bpm: "80-120", icon: "🚶" },
    { value: "fast", label: "Быстрый", bpm: "120-140", icon: "🏃" },
    { value: "very-fast", label: "Очень быстрый", bpm: "140+", icon: "⚡" },
  ], []);

  // Мемоизируем функцию переключения тегов
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
        title: "Генерация началась",
        description: "Создаём вашу музыку с помощью AI...",
      });
      
      await generateMusic();
      
      toast({
        title: "Музыка создана!",
        description: "Ваш трек успешно сгенерирован и готов к прослушиванию.",
      });
      
      if (onTrackGenerated) {
        onTrackGenerated();
      }
    } catch (error) {
      toast({
        title: "Ошибка генерации",
        description: "Не удалось создать музыку. Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  }, [generateMusic, vibrate, toast, onTrackGenerated]);

  const handleImprovePrompt = useCallback(async () => {
    vibrate('light');
    
    try {
      toast({
        title: "Улучшение промпта",
        description: "AI анализирует и улучшает ваше описание...",
      });
      
      await improvePrompt();
      
      toast({
        title: "Промпт улучшен!",
        description: "Описание музыки было оптимизировано для лучшего результата.",
      });
    } catch (error) {
      toast({
        title: "Ошибка улучшения",
        description: "Не удалось улучшить промпт. Попробуйте ещё раз.",
        variant: "destructive",
      });
    }
  }, [improvePrompt, vibrate, toast]);

  return (
    <Card 
      ref={cardRef}
      variant="gradient" 
      className={`
        w-full max-w-full p-3 sm:p-6 lg:p-8 space-y-4 sm:space-y-6
        hover-lift transition-all duration-700 ease-out
        ${isVisible ? 'animate-fade-in opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
    >
      {/* Декоративный фон */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none rounded-lg" />
      <div className="absolute top-0 right-0 w-20 h-20 sm:w-32 sm:h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
      <div className="space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
          <div className="p-2 sm:p-3 rounded-xl bg-gradient-primary shadow-glow animate-float shrink-0">
            <Music className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gradient-primary animate-shimmer">
              Создайте свою музыку с AI
            </h3>
            <p className="text-muted-foreground/80 text-xs sm:text-sm">
              Профессиональная генерация музыки с вокалом и лирикой
            </p>
          </div>
        </div>
      </div>

      {/* Вкладки */}
      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6 bg-background/50 backdrop-blur-sm border border-primary/20 h-auto">
          <TabsTrigger 
            value="simple" 
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 text-xs sm:text-sm py-2.5 px-2 sm:px-4"
          >
            <Zap className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden xs:inline">Простой режим</span>
            <span className="xs:hidden truncate">Простой</span>
          </TabsTrigger>
          <TabsTrigger 
            value="advanced"
            className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary transition-all duration-300 text-xs sm:text-sm py-2.5 px-2 sm:px-4"
          >
            <Settings2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 shrink-0" />
            <span className="hidden xs:inline">Расширенный</span>
            <span className="xs:hidden truncate">Расширенный</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-4 sm:space-y-6 animate-slide-up">
          {/* Основной промпт */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Music className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Опишите желаемую музыку
            </Label>
            <Textarea
              ref={textareaRef}
              placeholder="Пример: Энергичный электронный трек..."
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                adjustTextareaHeight();
              }}
              className="min-h-[80px] sm:min-h-[100px] resize-none bg-background/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300 hover:border-primary/30 text-sm"
              disabled={isGenerating || isImproving}
            />
          </div>

          {/* Популярные жанры */}
          <div className="space-y-2 sm:space-y-3">
            <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
              <Hash className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
              Популярные жанры
            </Label>
            <div className="flex flex-wrap gap-2">
              {popularGenres.map((genre) => (
                <Button
                  key={genre.name}
                  variant={styleTags.includes(genre.name) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleTag(genre.name)}
                  disabled={isGenerating || isImproving}
                  className={`
                    h-auto p-2 flex-1 flex flex-col items-center gap-1 transition-all duration-300 group
                    basis-[calc(33.333%-0.5rem)] sm:basis-[calc(16.666%-0.84rem)]
                    ${styleTags.includes(genre.name) 
                      ? `bg-gradient-to-r ${genre.gradient} text-white shadow-lg scale-105` 
                      : 'hover:scale-105 hover:border-primary/50 bg-background/50 backdrop-blur-sm'
                    }
                  `}
                >
                  <span className="text-base sm:text-lg group-hover:animate-bounce">{genre.icon}</span>
                  <span className="text-xs font-medium w-full text-center truncate">{genre.name}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Настроение и темп */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Volume2 className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Настроение
              </Label>
              <Select value={mood} onValueChange={setMood} disabled={isGenerating}>
                <SelectTrigger className="bg-background/50 backdrop-blur-sm border-primary/20 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 hover:border-primary/30 h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-sm border-primary/20">
                  {moodOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className="hover:bg-primary/10 transition-colors duration-200 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{option.icon}</span>
                        <span className="truncate">{option.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:space-y-3">
              <Label className="text-xs sm:text-sm font-medium flex items-center gap-2">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                Темп
              </Label>
              <Select value={tempo} onValueChange={setTempo} disabled={isGenerating}>
                <SelectTrigger className="bg-background/50 backdrop-blur-sm border-primary/20 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 hover:border-primary/30 h-9 sm:h-10 text-sm">
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent className="bg-background/95 backdrop-blur-sm border-primary/20">
                  {tempoOptions.map((option) => (
                    <SelectItem 
                      key={option.value} 
                      value={option.value} 
                      className="hover:bg-primary/10 transition-colors duration-200 text-sm"
                    >
                      <div className="flex items-center justify-between w-full gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-base">{option.icon}</span>
                          <span className="truncate">{option.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground shrink-0">{option.bpm}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Переключатель вокала */}
          <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 group">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300 shrink-0">
                <Mic className="h-4 w-4 sm:h-5 sm:w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div className="flex-1 min-w-0">
                <Label htmlFor="vocals-switch" className="text-xs sm:text-sm font-medium cursor-pointer">
                  Добавить вокал
                </Label>
                <p className="text-xs text-muted-foreground/70">
                  AI создаст вокал и лирику
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
              className="data-[state=checked]:bg-primary transition-all duration-300 shrink-0"
            />
          </div>

          {/* Кнопки действий */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="glass"
              onClick={handleImprovePrompt}
              disabled={isImproving || isGenerating || !prompt.trim()}
              className="flex-1 h-10 sm:h-12 group hover:scale-105 transition-all duration-300 text-xs sm:text-sm"
            >
              <Wand2 className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:animate-spin transition-transform duration-500" />
              {isImproving ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="hidden xs:inline">Улучшение...</span>
                  <span className="xs:hidden">...</span>
                </div>
              ) : (
                <span className="truncate">Улучшить с AI</span>
              )}
            </Button>

            <Button
              variant="hero"
              onClick={handleGenerateMusic}
              disabled={isGenerating || isImproving || !prompt.trim()}
              className="flex-1 h-10 sm:h-12 text-xs sm:text-base shadow-glow hover:scale-105 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              <Sparkles className="mr-1.5 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-pulse" />
              {isGenerating ? (
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span className="hidden xs:inline">Генерация...</span>
                  <span className="xs:hidden">...</span>
                </div>
              ) : (
                <span className="truncate">Сгенерировать музыку</span>
              )}
            </Button>
          </div>
        </TabsContent>

            <TabsContent value="advanced" className="space-y-6 animate-slide-up">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Левая колонка */}
                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Music className="h-4 w-4 text-primary" />
                      Описание музыки
                    </Label>
                    <Textarea
                      ref={textareaRef}
                      placeholder="Опишите желаемый стиль, инструменты, настроение..."
                      value={prompt}
                      onChange={(e) => {
                        setPrompt(e.target.value);
                        adjustTextareaHeight();
                      }}
                      className="min-h-[120px] resize-none bg-background/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300 hover:border-primary/30"
                      disabled={isGenerating || isImproving}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Settings2 className="h-4 w-4 text-primary" />
                      Провайдер AI
                    </Label>
                    <Select value={provider} onValueChange={(v) => setProvider(v as "replicate" | "suno")} disabled={isGenerating}>
                      <SelectTrigger className="bg-background/50 backdrop-blur-sm border-primary/20 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 hover:border-primary/30">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-background/95 backdrop-blur-sm border-primary/20">
                        <SelectItem value="suno" className="hover:bg-primary/10 transition-colors duration-200">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            Suno AI (Рекомендуется)
                          </div>
                        </SelectItem>
                        <SelectItem value="musicgen" className="hover:bg-primary/10 transition-colors duration-200">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                            MusicGen
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Hash className="h-4 w-4 text-primary" />
                      Жанры и стили
                    </Label>
                    <Input
                      placeholder="рок, электроника, джаз..."
                      value={styleTags.join(', ')}
                      onChange={(e) => setStyleTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                      className="bg-background/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300 hover:border-primary/30"
                      disabled={isGenerating || isImproving}
                    />
                  </div>

                  {/* Настроение и темп для расширенного режима */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Volume2 className="h-4 w-4 text-primary" />
                        Настроение
                      </Label>
                      <Select value={mood} onValueChange={setMood} disabled={isGenerating}>
                        <SelectTrigger className="bg-background/50 backdrop-blur-sm border-primary/20 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 hover:border-primary/30">
                          <SelectValue placeholder="Выберите настроение" />
                        </SelectTrigger>
                        <SelectContent className="bg-background/95 backdrop-blur-sm border-primary/20">
                          {moodOptions.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value} 
                              className="hover:bg-primary/10 transition-colors duration-200"
                            >
                              <div className="flex items-center gap-2">
                                <span>{option.icon}</span>
                                {option.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        Темп
                      </Label>
                      <Select value={tempo} onValueChange={setTempo} disabled={isGenerating}>
                        <SelectTrigger className="bg-background/50 backdrop-blur-sm border-primary/20 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300 hover:border-primary/30">
                          <SelectValue placeholder="Выберите темп" />
                        </SelectTrigger>
                        <SelectContent className="bg-background/95 backdrop-blur-sm border-primary/20">
                          {tempoOptions.map((option) => (
                            <SelectItem 
                              key={option.value} 
                              value={option.value} 
                              className="hover:bg-primary/10 transition-colors duration-200"
                            >
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                  <span>{option.icon}</span>
                                  {option.label}
                                </div>
                                <span className="text-xs text-muted-foreground">{option.bpm}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Правая колонка */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm hover:border-primary/40 transition-all duration-300 group">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                        <Mic className="h-5 w-5 text-primary group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div>
                        <Label htmlFor="advanced-vocals" className="text-sm font-medium cursor-pointer">
                          Расширенный вокал
                        </Label>
                        <p className="text-xs text-muted-foreground/70">
                          Настройка лирики и вокального стиля
                        </p>
                      </div>
                    </div>
                    <Switch
                      id="advanced-vocals"
                      checked={hasVocals}
                      onCheckedChange={(checked) => {
                        setHasVocals(checked);
                        vibrate('light');
                      }}
                      disabled={isGenerating || isImproving}
                      className="data-[state=checked]:bg-primary transition-all duration-300"
                    />
                  </div>

                  {hasVocals && (
                    <div className="space-y-4 animate-fade-in">
                      <div className="p-4 rounded-xl border border-primary/20 bg-gradient-to-br from-background/50 to-background/30 backdrop-blur-sm">
                        <Label className="text-sm font-medium mb-3 flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          Лирика
                        </Label>
                        <LyricsEditor
                          lyrics={lyrics}
                          onLyricsChange={(newLyrics) => setLyrics(newLyrics)}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3">
                    <Button
                      variant="glass"
                      onClick={handleImprovePrompt}
                      disabled={isImproving || isGenerating || !prompt.trim()}
                      className="h-12 group hover:scale-105 transition-all duration-300"
                    >
                      <Wand2 className="mr-2 h-5 w-5 group-hover:animate-spin transition-transform duration-500" />
                      {isImproving ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Улучшение...
                        </div>
                      ) : (
                        "Улучшить с AI"
                      )}
                    </Button>

                    <Button
                      variant="hero"
                      onClick={handleGenerateMusic}
                      disabled={isGenerating || isImproving || !prompt.trim()}
                      className="h-12 text-base shadow-glow hover:scale-105 transition-all duration-300 relative overflow-hidden group"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                      <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                      {isGenerating ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                          Генерация...
                        </div>
                      ) : (
                        "Создать музыку"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
      </Tabs>
      </div>
    </Card>
  );
};

// Экспортируем мемоизированный компонент с Error Boundary
export const MusicGenerator = withErrorBoundary(
  memo(MusicGeneratorComponent),
  {
    fallback: (
      <Card className="p-6">
        <div className="text-center">
          <Music className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Ошибка генератора музыки</h3>
          <p className="text-muted-foreground">
            Произошла ошибка при загрузке генератора. Попробуйте обновить страницу.
          </p>
        </div>
      </Card>
    )
  }
);

export default MusicGenerator;
