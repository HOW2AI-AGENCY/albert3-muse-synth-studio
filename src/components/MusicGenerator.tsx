import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Sparkles, Wand2, Music, Lightbulb } from "lucide-react";
import { useMusicGeneration } from "@/hooks/useMusicGeneration";

interface MusicGeneratorProps {
  onTrackGenerated?: () => void;
}

export const MusicGenerator = ({ onTrackGenerated }: MusicGeneratorProps) => {
  const {
    prompt,
    setPrompt,
    isGenerating,
    isImproving,
    improvePrompt,
    generateMusic,
  } = useMusicGeneration(onTrackGenerated);

  return (
    <Card className="card-glass p-8 space-y-6 hover-lift">
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary">
            <Music className="h-5 w-5 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-gradient-primary">
            Создайте свою музыку
          </h3>
        </div>
        <p className="text-muted-foreground">
          Опишите желаемую музыку, и AI создаст её для вас всего за минуту
        </p>
      </div>

      <div className="space-y-5">
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
            {isGenerating ? "Генерация..." : "Сгенерировать музыку"}
          </Button>
        </div>
      </div>
    </Card>
  );
};
