import React, { useState, useCallback, memo, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Music, Wand2, Play, Pause, Download, Heart, Share2, MoreHorizontal, Volume2, VolumeX, Lightbulb, Mic, Music2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMusicGeneration } from "@/hooks/useMusicGeneration";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { withErrorBoundary } from "@/components/ErrorBoundary";
import { logError } from "@/utils/logger";
import { LyricsEditor } from "@/components/LyricsEditor";

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

  // Мемоизируем массив популярных жанров
  const popularGenres = useMemo(() => [
    "Электроника", "Поп", "Рок", "Хип-хоп", "Джаз", 
    "Классика", "Эмбиент", "Лоу-фай", "Трэп", "Хаус"
  ], []);

  // Мемоизируем функцию переключения тегов
  const toggleTag = useCallback((tag: string) => {
    setStyleTags(prev =>
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  }, [setStyleTags]);

  return (
    <Card variant="gradient" className="p-8 space-y-6 hover-lift animate-fade-in">
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
              placeholder="Пример: Энергичный электронный трек с синтезаторными мелодиями и мощным басом, идеально подходит для тренировки..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
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
              onClick={improvePrompt}
              disabled={isImproving || isGenerating}
              className="flex-1 h-12 group"
            >
              <Wand2 className="mr-2 h-5 w-5 group-hover:animate-spin transition-transform" />
              {isImproving ? "Улучшение..." : "Улучшить с AI"}
            </Button>

            <Button
              variant="hero"
              onClick={generateMusic}
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
                <Select value={provider} onValueChange={setProvider} disabled={isGenerating}>
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
                  onChange={(e) => setStyleTags(e.target.value)}
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
                    <Label className="text-sm font-medium mb-3 block flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Лирика
                    </Label>
                    <LyricsEditor
                      value={lyrics}
                      onChange={setLyrics}
                      disabled={isGenerating || isImproving}
                      className="bg-background/30 border-primary/20"
                    />
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <Button
                  variant="glass"
                  onClick={improvePrompt}
                  disabled={isImproving || isGenerating}
                  className="h-12 group"
                >
                  <Wand2 className="mr-2 h-5 w-5 group-hover:animate-spin transition-transform" />
                  {isImproving ? "Улучшение..." : "Улучшить с AI"}
                </Button>

                <Button
                  variant="hero"
                  onClick={generateMusic}
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
