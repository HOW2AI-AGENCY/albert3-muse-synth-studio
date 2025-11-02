import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { Loader2, FileText } from "@/utils/iconImports";

interface LyricsGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId?: string;
  initialPrompt?: string;
  onGenerated?: (lyrics: string) => void;
}

const MAX_WORDS = 500; // Увеличен лимит для Lovable AI

export function LyricsGeneratorDialog({ 
  open, 
  onOpenChange, 
  trackId,
  initialPrompt = "",
  onGenerated
}: LyricsGeneratorDialogProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Введите описание для генерации текста песни"
      });
      return;
    }

    if (wordCount > MAX_WORDS) {
      toast({
        variant: "destructive",
        title: "Слишком длинный промпт",
        description: `Максимум ${MAX_WORDS} слов. Текущее количество: ${wordCount}`
      });
      return;
    }

    setIsGenerating(true);

    try {
      logger.info(`✍️ [LYRICS] Generating lyrics: ${prompt.substring(0, 50)}...`);

      // Используем Lovable AI вместо Suno для генерации лирики (нет лимита на длину промпта)
      const { data, error } = await supabase.functions.invoke('generate-lyrics-ai', {
        body: {
          prompt: prompt.trim()
        }
      });

      if (error) {
        throw error;
      }

      logger.info(`✅ [LYRICS] Lyrics generation completed`, data);

      // Lovable AI возвращает лирику напрямую
      if (data?.lyrics) {
        if (onGenerated) {
          onGenerated(data.lyrics);
        }
        
        // Сохраняем лирику в трек, если указан trackId
        if (trackId) {
          await supabase
            .from('tracks')
            .update({ lyrics: data.lyrics })
            .eq('id', trackId);
        }

        toast({
          title: "✨ Текст готов!",
          description: "Текст добавлен в форму"
        });
        
        onOpenChange(false);
        setPrompt("");
      } else {
        throw new Error('No lyrics generated');
      }
    } catch (error) {
      logger.error(`❌ [LYRICS] Error generating lyrics:`, error instanceof Error ? error : undefined);
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось сгенерировать текст"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px] gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            Генерация текста песни
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1.5">
            Опишите настроение, тему и стиль — AI создаст текст песни
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt" className="text-sm font-medium flex items-center gap-1.5">
                Описание
                <span className="text-destructive text-xs">*</span>
              </Label>
              <div className={`text-xs font-mono tabular-nums transition-colors ${
                wordCount > MAX_WORDS 
                  ? 'text-destructive font-semibold' 
                  : wordCount > MAX_WORDS * 0.8
                  ? 'text-orange-500'
                  : 'text-muted-foreground'
              }`}>
                {wordCount} / {MAX_WORDS}
              </div>
            </div>
            <Textarea
              id="prompt"
              placeholder="Например: песня о любви в стиле поп-рок, веселая и энергичная, с припевом о преодолении трудностей..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={7}
              className="resize-none text-sm leading-relaxed"
            />
            <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
              <div className="mt-0.5">💡</div>
              <p>
                Будьте конкретны: укажите жанр, настроение, тему и структуру песни для лучших результатов
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-0 gap-2 sm:gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isGenerating}
            className="flex-1 sm:flex-none"
          >
            Отмена
          </Button>
          <Button 
            onClick={handleGenerate} 
            disabled={isGenerating || !prompt.trim() || wordCount > MAX_WORDS}
            className="flex-1 sm:flex-none gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Генерация...</span>
              </>
            ) : (
              <>
                <FileText className="h-4 w-4" />
                <span>Сгенерировать</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
