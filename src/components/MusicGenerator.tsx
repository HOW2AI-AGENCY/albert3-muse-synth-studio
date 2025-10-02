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
    improvePrompt,
    generateMusic,
    provider,
    setProvider,
    hasVocals,
    setHasVocals,
    lyrics,
    setLyrics,
    styleTags,
    setStyleTags,
  } = useMusicGeneration(onTrackGenerated);
  
  const { triggerHaptic } = useHapticFeedback();
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
    triggerHaptic('light');
  }, [setStyleTags, triggerHaptic]);

  const handleGenerateMusic = useCallback(async () => {
    triggerHaptic('medium');
    await generateMusic({
      prompt,
      hasVocals,
      lyrics: hasVocals ? lyrics : undefined,
      provider,
      styleTags,
      mood,
      tempo,
    });
  }, [generateMusic, prompt, hasVocals, lyrics, provider, styleTags, mood, tempo, triggerHaptic]);

  const handleImprovePrompt = useCallback(async () => {
    triggerHaptic('light');
    await improvePrompt(prompt);
  }, [improvePrompt, prompt, triggerHaptic]);

  return (
    <Card 
      ref={cardRef}
      variant="gradient" 
      className={`
        p-8 space-y-6 hover-lift transition-all duration-700 ease-out
        ${isVisible ? 'animate-fade-in opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
      `}
    >
      {/* Декоративный фон */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 pointer-events-none" />
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      
      <div className="relative z-10">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-primary shadow-glow animate-float">
            <Music className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-3xl font-bold text-gradient-primary animate-shimmer">
              Создайте свою музыку с AI
            </h3>
            <p className="text-muted-foreground/80 text-sm">
              Профессиональная генерация музыки с вокалом и лирикой
            </p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-background/50 backdrop-blur-sm">
          <TabsTrigger value="simple" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Простой режим
          </TabsTrigger>
          <TabsTrigger value="advanced" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            Продвинутый
          </TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-6 mt-6 animate-slide-up">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
              <Lightbulb className="h-4 w-4 text-yellow-500 animate-pulse" />
              <span>Подсказка: Опишите жанр, инструменты, настроение и темп</span>
            </div>
            <Textarea
              ref={textareaRef}
              placeholder="Пример: Энергичный электронный трек с синтезаторными мелодиями и мощным басом, идеально подходит для тренировки..."
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                adjustTextareaHeight();
              }}
              className="min-h-[140px] resize-none bg-background/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300"
              disabled={isGenerating || isImproving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm hover:border-primary/40 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Mic className="h-5 w-5 text-primary" />
              </div>
              <div>
                <Label htmlFor="vocals-switch" className="text-sm font-medium">
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
              onCheckedChange={setHasVocals}
              disabled={isGenerating || isImproving}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="glass"
              onClick={handleImprovePrompt}
              disabled={isImproving || isGenerating}
              className="flex-1 h-12 group"
            >
              <Wand2 className="mr-2 h-5 w-5 group-hover:animate-spin transition-transform" />
              {isImproving ? "Улучшение..." : "Улучшить с AI"}
            </Button>

            <Button
              variant="hero"
              onClick={handleGenerateMusic}
              disabled={isGenerating || isImproving}
              className="flex-1 h-12 text-base shadow-glow"
            >
              <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
              {isGenerating ? "Генерация..." : "Сгенерировать музыку"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6 mt-6 animate-slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Music className="h-4 w-4 text-primary" />
                  Описание музыки
                </Label>
                <Textarea
                  placeholder="Опишите желаемый стиль, инструменты, настроение..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none bg-background/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300"
                  disabled={isGenerating || isImproving}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Провайдер AI
                </Label>
                <Select value={provider} onValueChange={(v) => setProvider(v as "replicate" | "suno")} disabled={isGenerating}>
                  <SelectTrigger className="bg-background/50 backdrop-blur-sm border-primary/20 focus:ring-primary/50 focus:border-primary/50 transition-all duration-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background/95 backdrop-blur-sm border-primary/20">
                    <SelectItem value="suno" className="hover:bg-primary/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        Suno AI (Рекомендуется)
                      </div>
                    </SelectItem>
                    <SelectItem value="musicgen" className="hover:bg-primary/10">
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
                  value={styleTags}
                  onChange={(e) => setStyleTags(e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                  className="bg-background/50 backdrop-blur-sm border-primary/20 focus-visible:ring-primary/50 focus-visible:border-primary/50 transition-all duration-300"
                  disabled={isGenerating || isImproving}
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-gradient-to-r from-background/50 to-background/30 backdrop-blur-sm hover:border-primary/40 transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Mic className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Label htmlFor="advanced-vocals" className="text-sm font-medium">
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
                  onCheckedChange={setHasVocals}
                  disabled={isGenerating || isImproving}
                  className="data-[state=checked]:bg-primary"
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
                  disabled={isImproving || isGenerating}
                  className="h-12 group"
                >
                  <Wand2 className="mr-2 h-5 w-5 group-hover:animate-spin transition-transform" />
                  {isImproving ? "Улучшение..." : "Улучшить с AI"}
                </Button>

                <Button
                  variant="hero"
                  onClick={handleGenerateMusic}
                  disabled={isGenerating || isImproving}
                  className="h-12 text-base shadow-glow"
                >
                  <Sparkles className="mr-2 h-5 w-5 animate-pulse" />
                  {isGenerating ? "Генерация..." : "Создать музыку"}
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
  <Card className="p-6">
    <div className="text-center">
      <Music className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Ошибка генератора музыки</h3>
      <p className="text-muted-foreground">
        Произошла ошибка при загрузке генератора. Попробуйте обновить страницу.
      </p>
    </div>
  </Card>
);
