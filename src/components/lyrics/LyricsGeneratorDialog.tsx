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
import { Loader2, FileText } from "lucide-react";

interface LyricsGeneratorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId?: string;
  onSuccess?: (jobId: string) => void;
  onGenerated?: (lyrics: string) => void;
}

const MAX_WORDS = 200;

export function LyricsGeneratorDialog({ 
  open, 
  onOpenChange, 
  trackId,
  onSuccess,
  onGenerated: _onGenerated
}: LyricsGeneratorDialogProps) {
  const [prompt, setPrompt] = useState("");
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

      const { data, error } = await supabase.functions.invoke('generate-lyrics', {
        body: {
          prompt: prompt.trim(),
          trackId: trackId || null
        }
      });

      if (error) {
        throw error;
      }

      logger.info(`✅ [LYRICS] Lyrics generation started:`, data);

      toast({
        title: "Генерация началась",
        description: "Текст песни будет готов через 10-30 секунд"
      });

      if (data?.jobId && onSuccess) {
        onSuccess(data.jobId);
      }

      onOpenChange(false);
      setPrompt("");
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Генерация текста песни
          </DialogTitle>
          <DialogDescription>
            Опишите настроение, тему и стиль для вашего текста
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="prompt">
                Описание <span className="text-destructive">*</span>
              </Label>
              <span className={`text-xs ${wordCount > MAX_WORDS ? 'text-destructive' : 'text-muted-foreground'}`}>
                {wordCount} / {MAX_WORDS} слов
              </span>
            </div>
            <Textarea
              id="prompt"
              placeholder="Например: песня о любви в стиле поп-рок, веселая и энергичная..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              AI создаст несколько вариантов текста на основе вашего описания
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Отмена
          </Button>
          <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim() || wordCount > MAX_WORDS}>
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Генерация...
              </>
            ) : (
              'Сгенерировать'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
