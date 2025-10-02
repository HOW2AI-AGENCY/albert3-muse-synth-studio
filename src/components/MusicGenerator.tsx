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
    <Card className="card-glass p-8 space-y-6 hover-lift">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Music className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gradient-primary">
            Создайте свою музыку с AI
          </h3>
        </div>
        <p className="text-muted-foreground">
          Профессиональная генерация музыки с вокалом и лирикой
        </p>
      </div>

      <Tabs defaultValue="simple" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="simple">Простой режим</TabsTrigger>
          <TabsTrigger value="advanced">Продвинутый</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="space-y-5 mt-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>Подсказка: Опишите жанр, инструменты, настроение и темп</span>
            </div>
            <Textarea
              placeholder="Пример: Энергичный электронный трек с синтезаторными мелодиями и мощным басом, идеально подходит для тренировки..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[140px] resize-none bg-background/50 focus-visible:ring-primary/50 transition-all"
              disabled={isGenerating || isImproving}
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border bg-background/30">
            <div className="flex items-center gap-3">
              <Mic className="h-5 w-5 text-primary" />
              <div>
                <Label htmlFor="vocals-switch" className="text-sm font-medium">
                  Добавить вокал
                </Label>
                <p className="text-xs text-muted-foreground">
                  AI создаст вокал и лирику
                </p>
              </div>
            </div>
            <Switch
              id="vocals-switch"
              checked={hasVocals}
              onCheckedChange={setHasVocals}
              disabled={isGenerating || isImproving}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant="glow"
              onClick={improvePrompt}
              disabled={isImproving || isGenerating}
              className="flex-1 h-12"
            >
              <Wand2 className="mr-2 h-5 w-5" />
              {isImproving ? "Улучшение..." : "Улучшить с AI"}
            </Button>

            <Button
              variant="hero"
              onClick={generateMusic}
              disabled={isGenerating || isImproving}
              className="flex-1 h-12 text-base"
            >
              <Sparkles className="mr-2 h-5 w-5" />
              {isGenerating ? "Сгенерировать музыку" : "Сгенерировать музыку"}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-5 mt-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Провайдер генерации</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant={provider === 'suno' ? 'default' : 'outline'}
                  onClick={() => setProvider('suno')}
                  disabled={isGenerating}
                  className="h-20 flex flex-col items-center justify-center gap-1"
                >
                  <Music2 className="h-5 w-5" />
                  <span className="font-semibold">Suno AI</span>
                  <span className="text-xs opacity-70">До 4 мин, вокал</span>
                </Button>
                <Button
                  variant={provider === 'replicate' ? 'default' : 'outline'}
                  onClick={() => setProvider('replicate')}
                  disabled={isGenerating}
                  className="h-20 flex flex-col items-center justify-center gap-1"
                >
                  <Music className="h-5 w-5" />
                  <span className="font-semibold">MusicGen</span>
                  <span className="text-xs opacity-70">Быстро, instrumental</span>
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Промпт описания</Label>
              <Textarea
                placeholder="Опишите желаемый стиль музыки..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[100px]"
                disabled={isGenerating || isImproving}
              />
            </div>

            <div className="space-y-2">
              <Label>Жанры и стили</Label>
              <div className="flex flex-wrap gap-2">
                {popularGenres.map((genre) => (
                  <Badge
                    key={genre}
                    variant={styleTags.includes(genre) ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary/80 transition-colors"
                    onClick={() => toggleTag(genre)}
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border bg-background/30">
              <div className="flex items-center gap-3">
                <Mic className="h-5 w-5 text-primary" />
                <div>
                  <Label htmlFor="vocals-advanced" className="text-sm font-medium">
                    Добавить вокал
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Только для Suno AI
                  </p>
                </div>
              </div>
              <Switch
                id="vocals-advanced"
                checked={hasVocals}
                onCheckedChange={setHasVocals}
                disabled={isGenerating || provider !== 'suno'}
              />
            </div>

            {hasVocals && provider === 'suno' && (
              <LyricsEditor lyrics={lyrics} onLyricsChange={setLyrics} />
            )}

            <div className="flex gap-3">
              <Button
                variant="glow"
                onClick={improvePrompt}
                disabled={isImproving || isGenerating}
                className="flex-1 h-12"
              >
                <Wand2 className="mr-2 h-5 w-5" />
                {isImproving ? "Улучшение..." : "Улучшить промпт"}
              </Button>

              <Button
                variant="hero"
                onClick={generateMusic}
                disabled={isGenerating || isImproving}
                className="flex-1 h-12 text-base"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                {isGenerating ? "Генерация..." : "Создать трек"}
              </Button>
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
