import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logger } from "@/utils/logger";
import { isNetworkAbortError } from "@/utils/errors";
import { Loader2, FileText, Edit2, Copy } from "lucide-react";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { cn } from "@/lib/utils";

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
  const [generatedLyrics, setGeneratedLyrics] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const { toast } = useToast();
  const { vibrate } = useHapticFeedback();

  const wordCount = prompt.trim().split(/\s+/).filter(Boolean).length;
  const editWordCount = editPrompt.trim().split(/\s+/).filter(Boolean).length;

  // Загрузка автопромпта из sessionStorage при открытии
  useEffect(() => {
    if (open) {
      const autoPrompt = sessionStorage.getItem('autoLyricsPrompt');
      if (autoPrompt) {
        setPrompt(autoPrompt);
        sessionStorage.removeItem('autoLyricsPrompt');
        logger.info('🎵 Auto-loaded lyrics prompt', 'LyricsGeneratorDialog');
      }
    }
  }, [open]);

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

    vibrate('light');
    setGeneratedLyrics(null);
    setIsGenerating(true);

    try {
      logger.info(`✍️ [LYRICS] Generating lyrics with AI: ${prompt.substring(0, 50)}...`);

      // Используем Lovable AI для генерации лирики
      const { data, error } = await supabase.functions.invoke('generate-lyrics-ai', {
        body: {
          prompt: prompt.trim(),
          trackId: trackId, // Передаем trackId для автосохранения
        }
      });

      if (error) {
        // Если это отмена запроса (закрыли диалог/перешли на другую страницу), не показываем критическую ошибку
        if (isNetworkAbortError(error)) {
          logger.debug('[LYRICS] Request aborted during generation', 'LyricsGeneratorDialog', { trackId });
          return;
        }
        throw error;
      }

      logger.info(`✅ [LYRICS] Lyrics generation completed`, data);

      // Lovable AI возвращает лирику напрямую
      if (data?.lyrics) {
        setGeneratedLyrics(data.lyrics);
        
        // Передаем лирику в callback
        if (onGenerated) {
          onGenerated(data.lyrics);
        }

        toast({
          title: "✨ Текст готов!",
          description: trackId 
            ? "Текст сгенерирован и автоматически сохранен в трек"
            : "Посмотрите результат ниже"
        });
      } else {
        throw new Error('No lyrics generated');
      }
    } catch (error) {
      if (isNetworkAbortError(error)) {
        // Тихо игнорируем отмену: это нормальная ситуация при закрытии окна/навигации
        logger.debug('[LYRICS] Generation aborted', 'LyricsGeneratorDialog', { trackId });
      } else {
        logger.error(`❌ [LYRICS] Error generating lyrics:`, error instanceof Error ? error : undefined);
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: error instanceof Error ? error.message : "Не удалось сгенерировать текст"
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleEditWithAI = async () => {
    if (!editPrompt.trim() || !generatedLyrics) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "Введите описание правок"
      });
      return;
    }

    if (editWordCount > MAX_WORDS) {
      toast({
        variant: "destructive",
        title: "Слишком длинный промпт",
        description: `Максимум ${MAX_WORDS} слов. Текущее количество: ${editWordCount}`
      });
      return;
    }

    vibrate('light');
    setIsGenerating(true);

    try {
      logger.info(`✏️ [LYRICS] Editing lyrics with AI: ${editPrompt.substring(0, 50)}...`);

      const { data, error } = await supabase.functions.invoke('generate-lyrics-ai', {
        body: {
          prompt: `Edit the following lyrics based on this instruction: "${editPrompt}"\n\nOriginal lyrics:\n${generatedLyrics}`,
          trackId: trackId,
        }
      });

      if (error) {
        if (isNetworkAbortError(error)) {
          logger.debug('[LYRICS] Request aborted during edit', 'LyricsGeneratorDialog', { trackId });
          return;
        }
        throw error;
      }

      if (data?.lyrics) {
        setGeneratedLyrics(data.lyrics);
        
        if (onGenerated) {
          onGenerated(data.lyrics);
        }

        toast({
          title: "✨ Текст отредактирован!",
          description: trackId 
            ? "Изменения автоматически сохранены в трек"
            : "Посмотрите обновленный результат"
        });

        setIsEditMode(false);
        setEditPrompt("");
      } else {
        throw new Error('No edited lyrics generated');
      }
    } catch (error) {
      if (isNetworkAbortError(error)) {
        logger.debug('[LYRICS] Edit aborted', 'LyricsGeneratorDialog', { trackId });
      } else {
        logger.error(`❌ [LYRICS] Error editing lyrics:`, error instanceof Error ? error : undefined);
        toast({
          variant: "destructive",
          title: "Ошибка",
          description: error instanceof Error ? error.message : "Не удалось отредактировать текст"
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-[540px] max-h-[85vh] flex flex-col gap-0 p-0 pb-safe">
        <DialogHeader className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-b flex-shrink-0">
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

        <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4">
          {generatedLyrics ? (
            <div className="space-y-3">
              <Label htmlFor="generated" className="text-sm font-medium">Сгенерированный текст</Label>
              <Textarea
                id="generated"
                value={generatedLyrics}
                onChange={(e) => setGeneratedLyrics(e.target.value)}
                rows={14}
                className="resize-none text-base sm:text-sm leading-relaxed font-mono"
              />
              
              {/* Edit Mode Form */}
              {isEditMode && (
                <div className="space-y-2 p-3 border border-primary/20 rounded-lg bg-primary/5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="edit-prompt" className="text-sm font-medium flex items-center gap-1.5">
                      Описание правок
                      <span className="text-destructive text-xs">*</span>
                    </Label>
                    <div className={cn(
                      "text-xs font-mono tabular-nums transition-colors",
                      editWordCount > MAX_WORDS 
                        ? 'text-destructive font-semibold' 
                        : editWordCount > MAX_WORDS * 0.8
                        ? 'text-orange-500'
                        : 'text-muted-foreground'
                    )}>
                      {editWordCount} / {MAX_WORDS}
                    </div>
                  </div>
                  <Input
                    id="edit-prompt"
                    placeholder="Например: сделай припев более энергичным, добавь рифмы в первом куплете..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="text-sm"
                  />
                  <div className="flex gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsEditMode(false);
                        setEditPrompt("");
                      }}
                      disabled={isGenerating}
                      className="flex-1 h-8"
                    >
                      Отмена
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleEditWithAI}
                      disabled={isGenerating || !editPrompt.trim() || editWordCount > MAX_WORDS}
                      className="flex-1 h-8 gap-2"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Применение...</span>
                        </>
                      ) : (
                        <>
                          <Edit2 className="h-3 w-3" />
                          <span>Применить</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>
                  {trackId 
                    ? "Текст автоматически сохранён в трек"
                    : "Текст сгенерирован"}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="prompt" className="text-sm font-medium flex items-center gap-1.5">
                  Описание
                  <span className="text-destructive text-xs">*</span>
                </Label>
                <div className={cn(
                  "text-xs font-mono tabular-nums transition-colors",
                  wordCount > MAX_WORDS 
                    ? 'text-destructive font-semibold' 
                    : wordCount > MAX_WORDS * 0.8
                    ? 'text-orange-500'
                    : 'text-muted-foreground'
                )}>
                  {wordCount} / {MAX_WORDS}
                </div>
              </div>
              <Textarea
                id="prompt"
                placeholder="Например: песня о любви в стиле поп-рок, веселая и энергичная, с припевом о преодолении трудностей..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={7}
                className="resize-none text-base sm:text-sm leading-relaxed"
              />
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <div className="mt-0.5">💡</div>
                <p>
                  Будьте конкретны: укажите жанр, настроение, тему и структуру песни для лучших результатов
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-shrink-0 bg-background border-t px-3 sm:px-6 py-3 sm:py-4 gap-2">
          {generatedLyrics ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  navigator.clipboard.writeText(generatedLyrics);
                  toast({
                    title: "Скопировано!",
                    description: "Текст песни скопирован в буфер обмена",
                  });
                }}
                disabled={isGenerating}
                className="flex-1 sm:flex-none h-11 sm:h-10 gap-2"
              >
                <Copy className="h-4 w-4" />
                <span>Копировать</span>
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  if (!isEditMode) {
                    setIsEditMode(true);
                  }
                }}
                disabled={isGenerating || isEditMode}
                className="flex-1 sm:flex-none h-11 sm:h-10 gap-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>Редактировать с AI</span>
              </Button>
              <Button 
                onClick={() => {
                  setGeneratedLyrics(null);
                  setIsEditMode(false);
                  setEditPrompt("");
                }}
                disabled={isGenerating}
                className="flex-1 sm:flex-none h-11 sm:h-10"
              >
                Создать заново
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)} 
                disabled={isGenerating}
                className="flex-1 sm:flex-none h-11 sm:h-10"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleGenerate} 
                disabled={isGenerating || !prompt.trim() || wordCount > MAX_WORDS}
                className="flex-1 sm:flex-none gap-2 h-11 sm:h-10"
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
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
