import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Music2, Wand2, FileText, Eye, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/utils/logger";
import { LyricsEditorAdvanced } from "./lyrics/LyricsEditorAdvanced";

const limitWords = (value: string, limit: number): string => {
  if (!value.trim()) return "";
  const words = value.trim().split(/\s+/);
  if (words.length <= limit) return value.trim();
  return words.slice(0, limit).join(" ");
};

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface LyricsEditorProps {
  lyrics: string;
  onLyricsChange: (lyrics: string) => void;
}

export const LyricsEditor = ({ lyrics, onLyricsChange }: LyricsEditorProps) => {
  // AI Generation fields
  const [theme, setTheme] = useState("");
  const [mood, setMood] = useState("");
  const [genre, setGenre] = useState("");
  const [language, setLanguage] = useState<'ru' | 'en'>('ru');
  const [vocalStyle, setVocalStyle] = useState("");
  const [references, setReferences] = useState("");
  
  // Song structure
  const [includeIntro, setIncludeIntro] = useState(false);
  const [includeVerse, setIncludeVerse] = useState(true);
  const [includeChorus, setIncludeChorus] = useState(true);
  const [includeBridge, setIncludeBridge] = useState(false);
  const [includeOutro, setIncludeOutro] = useState(false);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [useAdvancedEditor, setUseAdvancedEditor] = useState(false);
  const { toast } = useToast();

  // Character and line count
  const lineCount = lyrics.split('\n').filter(line => line.trim()).length;
  const charCount = lyrics.length;

  const buildPrompt = () => {
    const sections: string[] = [];
    if (includeIntro) sections.push("Intro");
    if (includeVerse) sections.push("Verse");
    if (includeChorus) sections.push("Chorus");
    if (includeBridge) sections.push("Bridge");
    if (includeOutro) sections.push("Outro");

    const trimmedReferences = limitWords(references, 80);

    const lines: string[] = [
      "Create professional, performance-ready song lyrics that match the provided brief.",
      `Theme: ${theme.trim()}`,
      `Mood: ${mood.trim()}`,
      `Genre: ${genre.trim()}`,
      `Language: ${language === 'ru' ? 'Russian' : 'English'}`,
    ];

    if (sections.length > 0) {
      lines.push(`Desired structure: ${sections.join(', ')}`);
    }

    if (vocalStyle.trim()) {
      lines.push(`Preferred vocal style: ${vocalStyle.trim()}`);
    }

    if (trimmedReferences) {
      lines.push(`Creative references or instructions: ${trimmedReferences}`);
    }

    lines.push("Deliver at least two distinct lyric variations, marking sections like [Verse] and [Chorus].");
    lines.push("Ensure the lyrics flow naturally, respect the requested language, and keep wording within 200 words.");

    return lines.join("\n");
  };

  const pollLyricsJob = async (jobId: string): Promise<string> => {
    const maxAttempts = 30;
    const delayMs = 4000;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      if (attempt > 0) {
        await wait(delayMs);
      }

      const job = await ApiService.getLyricsJob(jobId);
      if (!job) {
        continue;
      }

      if (job.status === "failed") {
        throw new Error(job.errorMessage || "Lyrics generation failed");
      }

      if (job.status === "completed") {
        const variants = job.variants || [];
        const completedVariant = variants.find((variant) => (variant.status ?? "").toLowerCase() === "complete" && variant.content);
        const fallbackVariant = variants.find((variant) => variant.content);
        const chosen = completedVariant ?? fallbackVariant;
        if (chosen?.content) {
          return chosen.content;
        }
        throw new Error("Lyrics generation completed without content");
      }
    }

    throw new Error("Lyrics generation timed out");
  };

  const generateLyrics = async () => {
    if (!theme.trim() || !mood.trim() || !genre.trim()) {
      toast({
        title: "Заполните все поля",
        description: "Укажите тему, настроение и жанр для генерации лирики",
        variant: "destructive",
      });
      return;
    }

    const prompt = buildPrompt();
    const trimmedReferences = limitWords(references, 80);
    const metadata = {
      theme: theme.trim(),
      mood: mood.trim(),
      genre: genre.trim(),
      language,
      structure: {
        intro: includeIntro,
        verse: includeVerse,
        chorus: includeChorus,
        bridge: includeBridge,
        outro: includeOutro,
      },
      vocalStyle: vocalStyle.trim() || null,
      references: trimmedReferences || null,
    };

    setIsGenerating(true);
    try {
      const response = await ApiService.generateLyrics({
        prompt,
        metadata,
      });

      toast({
        title: "✨ Генерация запущена",
        description: "Ожидаем ответ от Suno...",
      });

      const generated = await pollLyricsJob(response.jobId);
      onLyricsChange(generated);

      toast({
        title: "✨ Лирика создана!",
        description: "Текст песни получен от Suno",
      });
    } catch (error) {
      logError("Ошибка при генерации текста", error as Error, "LyricsEditor", {
        theme,
        mood,
        genre,
        language,
      });

      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось сгенерировать текст. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const improveLyrics = async () => {
    if (!lyrics.trim()) {
      toast({
        title: "Нет текста для улучшения",
        description: "Введите текст песни, который хотите улучшить",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(true);
    try {
      const { data, error } = await supabase.functions.invoke('improve-lyrics', {
        body: {
          currentLyrics: lyrics,
          language,
          style: genre || vocalStyle,
          instructions: references,
        }
      });

      if (error) throw error;

      onLyricsChange(data.improvedLyrics);
      
      toast({
        title: "✨ Текст улучшен!",
        description: "AI оптимизировал вашу лирику",
      });
    } catch (error) {
      logError("Ошибка при улучшении текста", error as Error, "LyricsEditor");
      
      toast({
        title: "Ошибка",
        description: "Не удалось улучшить текст. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <Card className="card-glass p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Music2 className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Лирика песни</h3>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUseAdvancedEditor(!useAdvancedEditor)}
            className="gap-2"
          >
            <Music className="h-4 w-4" />
            {useAdvancedEditor ? 'Простой редактор' : 'Продвинутый редактор'}
          </Button>
          <div className="text-xs text-muted-foreground">
            {lineCount} строк · {charCount} символов
          </div>
        </div>
      </div>

      {useAdvancedEditor ? (
        <LyricsEditorAdvanced lyrics={lyrics} onLyricsChange={onLyricsChange} />
      ) : (
        <>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="generate">
            <Sparkles className="w-4 h-4 mr-2" />
            AI Генерация
          </TabsTrigger>
          <TabsTrigger value="manual">
            <FileText className="w-4 h-4 mr-2" />
            Вручную
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          {/* Language Selection */}
          <div className="space-y-2">
            <Label>Язык</Label>
            <Select value={language} onValueChange={(val: 'ru' | 'en') => setLanguage(val)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ru">🇷🇺 Русский</SelectItem>
                <SelectItem value="en">🇬🇧 English</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Main fields */}
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

          {/* Song Structure */}
          <div className="space-y-2">
            <Label>Структура песни</Label>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="intro" 
                  checked={includeIntro} 
                  onCheckedChange={(checked) => setIncludeIntro(!!checked)}
                />
                <Label htmlFor="intro" className="cursor-pointer font-normal">Intro</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="verse" 
                  checked={includeVerse} 
                  onCheckedChange={(checked) => setIncludeVerse(!!checked)}
                />
                <Label htmlFor="verse" className="cursor-pointer font-normal">Verse</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="chorus" 
                  checked={includeChorus} 
                  onCheckedChange={(checked) => setIncludeChorus(!!checked)}
                />
                <Label htmlFor="chorus" className="cursor-pointer font-normal">Chorus</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="bridge" 
                  checked={includeBridge} 
                  onCheckedChange={(checked) => setIncludeBridge(!!checked)}
                />
                <Label htmlFor="bridge" className="cursor-pointer font-normal">Bridge</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="outro" 
                  checked={includeOutro} 
                  onCheckedChange={(checked) => setIncludeOutro(!!checked)}
                />
                <Label htmlFor="outro" className="cursor-pointer font-normal">Outro</Label>
              </div>
            </div>
          </div>

          {/* Vocal Style */}
          <div className="space-y-2">
            <Label htmlFor="vocal-style">Вокальный стиль</Label>
            <Select value={vocalStyle} onValueChange={setVocalStyle}>
              <SelectTrigger id="vocal-style">
                <SelectValue placeholder="Выберите стиль..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Мужской вокал</SelectItem>
                <SelectItem value="female">Женский вокал</SelectItem>
                <SelectItem value="duet">Дуэт</SelectItem>
                <SelectItem value="choir">Хор</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* References */}
          <div className="space-y-2">
            <Label htmlFor="references">Референсы (опционально)</Label>
            <Textarea
              id="references"
              placeholder="Примеры артистов или песен для вдохновения..."
              value={references}
              onChange={(e) => setReferences(e.target.value)}
              className="min-h-[80px]"
              disabled={isGenerating}
            />
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
        </TabsContent>

        <TabsContent value="manual" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="manual-lyrics">Введите текст песни</Label>
            <Textarea
              id="manual-lyrics"
              placeholder="Введите или вставьте текст вашей песни..."
              value={lyrics}
              onChange={(e) => onLyricsChange(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
          </div>

          <Button
            onClick={improveLyrics}
            disabled={isImproving || !lyrics.trim()}
            variant="outline"
            className="w-full"
          >
            <Wand2 className="mr-2 h-4 w-4" />
            {isImproving ? "Улучшение..." : "Улучшить с AI"}
          </Button>
        </TabsContent>
      </Tabs>

      {/* Preview Mode */}
      {lyrics && (
        <div className="space-y-2 border-t pt-4">
          <div className="flex items-center justify-between">
            <Label>Текст песни</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="h-4 w-4 mr-2" />
              {showPreview ? 'Редактировать' : 'Предпросмотр'}
            </Button>
          </div>
          
          {showPreview ? (
            <div className="p-4 bg-muted/50 rounded-md min-h-[200px] whitespace-pre-wrap font-mono text-sm">
              {lyrics}
            </div>
          ) : (
            <Textarea
              value={lyrics}
              onChange={(e) => onLyricsChange(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
              placeholder="Текст песни появится здесь..."
            />
          )}
        </div>
      )}
      </>
      )}
    </Card>
  );
};
