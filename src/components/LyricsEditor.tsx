import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Music2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api.service";
import { logError, logInfo } from "@/utils/logger";

interface LyricsEditorProps {
  lyrics: string;
  onLyricsChange: (lyrics: string) => void;
}

export const LyricsEditor = ({ lyrics, onLyricsChange }: LyricsEditorProps) => {
  const [theme, setTheme] = useState("");
  const [mood, setMood] = useState("");
  const [genre, setGenre] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const generateLyrics = async () => {
    if (!theme.trim() || !mood.trim() || !genre.trim()) {
      toast({
        title: "Заполните все поля",
        description: "Укажите тему, настроение и жанр для генерации лирики",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const response = await ApiService.generateLyrics({
        theme,
        mood,
        genre,
        language: 'ru',
      });

      onLyricsChange(response.lyrics);
      
      toast({
        title: "✨ Лирика создана!",
        description: "Текст песни сгенерирован с помощью AI",
      });
    } catch (error) {
      logError("Ошибка при генерации текста", error as Error, "LyricsEditor", {
        theme,
        mood,
        genre,
        language: 'ru'
      });
      
      toast({
        title: "Ошибка",
        description: "Не удалось сгенерировать текст. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="card-glass p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Music2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Лирика песни</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-2">
          <Label htmlFor="theme">Тема</Label>
          <Input
            id="theme"
            placeholder="Любовь, мечты, приключения..."
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            disabled={isGenerating}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mood">Настроение</Label>
          <Input
            id="mood"
            placeholder="Радостное, грустное, энергичное..."
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            disabled={isGenerating}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="genre">Жанр</Label>
          <Input
            id="genre"
            placeholder="Поп, рок, электро..."
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            disabled={isGenerating}
          />
        </div>
      </div>

      <Button
        onClick={generateLyrics}
        disabled={isGenerating}
        variant="glow"
        className="w-full"
      >
        <Sparkles className="mr-2 h-4 w-4" />
        {isGenerating ? "Генерация..." : "Сгенерировать лирику с AI"}
      </Button>

      <div className="space-y-2">
        <Label htmlFor="lyrics">Текст песни (можно редактировать)</Label>
        <Textarea
          id="lyrics"
          placeholder="Текст песни появится здесь или введите свой..."
          value={lyrics}
          onChange={(e) => onLyricsChange(e.target.value)}
          className="min-h-[200px] font-mono text-sm"
          disabled={isGenerating}
        />
      </div>
    </Card>
  );
};
