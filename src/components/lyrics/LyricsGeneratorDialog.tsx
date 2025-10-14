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
import { LyricsVariantSelectorDialog } from "@/components/lyrics/LyricsVariantSelector";

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
  onGenerated
}: LyricsGeneratorDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [variantSelectorOpen, setVariantSelectorOpen] = useState(false);
  const [variants, setVariants] = useState<any[]>([]);
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
          ...(trackId && { trackId })
        }
      });

      if (error) {
        throw error;
      }

      logger.info(`✅ [LYRICS] Lyrics generation started:`, data);

      // Poll for results
      if (data?.jobId) {
        logger.info(`⏳ [LYRICS] Polling for job ${data.jobId}...`);
        
        toast({
          title: "Генерация началась",
          description: "Получаем результаты..."
        });

        // Poll every 3 seconds for max 30 seconds
        let attempts = 0;
        const maxAttempts = 10;
        const pollInterval = setInterval(async () => {
          attempts++;
          
          try {
            const { data: jobData, error: jobError } = await supabase
              .from('lyrics_jobs')
              .select('*, lyrics_variants(*)')
              .eq('id', data.jobId)
              .single();

            if (jobError) throw jobError;

            logger.info(`📊 [LYRICS] Poll attempt ${attempts}/${maxAttempts}, status: ${jobData.status}`);

            if (jobData.status === 'completed' && jobData.lyrics_variants?.length > 0) {
              clearInterval(pollInterval);
              
              logger.info(`✅ [LYRICS] Got ${jobData.lyrics_variants.length} variants`);
              
              // If multiple variants, show selector
              if (jobData.lyrics_variants.length > 1) {
                setVariants(jobData.lyrics_variants);
                setVariantSelectorOpen(true);
                toast({
                  title: "✨ Текст готов!",
                  description: `Получено ${jobData.lyrics_variants.length} вариантов. Выберите лучший!`
                });
              } else {
                // Auto-select single variant
                const firstVariant = jobData.lyrics_variants[0];
                if (onGenerated && firstVariant.content) {
                  onGenerated(firstVariant.content);
                }
                toast({
                  title: "✨ Текст готов!",
                  description: "Текст добавлен в форму"
                });
                onOpenChange(false);
                setPrompt("");
              }
            } else if (jobData.status === 'failed') {
              clearInterval(pollInterval);
              logger.error(`❌ [LYRICS] Generation failed`, new Error(jobData.error_message || 'Generation failed'), `[LYRICS]`, {
                jobId: data.jobId,
                attempts
              });
              throw new Error(jobData.error_message || 'Генерация не удалась');
            } else if (attempts >= maxAttempts) {
              clearInterval(pollInterval);
              logger.error(`❌ [LYRICS] Timeout reached`, new Error('Timeout'), `[LYRICS]`, {
                jobId: data.jobId,
                maxAttempts,
                lastStatus: jobData.status
              });
              throw new Error('Превышено время ожидания');
            }
          } catch (pollError) {
            clearInterval(pollInterval);
            logger.error(`❌ [LYRICS] Polling error:`, pollError instanceof Error ? pollError : undefined);
            toast({
              variant: "destructive",
              title: "Ошибка",
              description: pollError instanceof Error ? pollError.message : "Не удалось получить результаты"
            });
          }
        }, 3000);

        if (onSuccess) {
          onSuccess(data.jobId);
        }
      } else {
        toast({
          title: "Генерация началась",
          description: "Текст песни будет готов через 10-30 секунд"
        });
        onOpenChange(false);
        setPrompt("");
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
    <>
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
              Опишите настроение, тему и стиль — AI создаст несколько вариантов
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

    <LyricsVariantSelectorDialog
      open={variantSelectorOpen}
      onOpenChange={setVariantSelectorOpen}
      jobId={variants[0]?.job_id || ''}
      onSelect={(lyrics) => {
        if (onGenerated) {
          onGenerated(lyrics);
        }
        setVariantSelectorOpen(false);
        onOpenChange(false);
        setPrompt("");
      }}
    />
    </>
  );
}
