import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Music4, Loader2, Mic, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SeparateStemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle?: string;
  onSuccess?: () => void;
}

export const SeparateStemsDialog = ({
  open,
  onOpenChange,
  trackId,
  trackTitle,
  onSuccess,
}: SeparateStemsDialogProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedMode, setSelectedMode] = useState<'separate_vocal' | 'split_stem' | null>(null);

  const handleGenerate = async (mode: 'separate_vocal' | 'split_stem') => {
    setIsGenerating(true);
    setSelectedMode(mode);

    try {
      const { data: response, error } = await supabase.functions.invoke<{
        success?: boolean;
        taskId?: string;
        error?: string;
      }>('separate-stems', {
        body: {
          trackId,
          separationMode: mode,
        },
      });

      if (error) {
        throw new Error(error.message ?? 'Не удалось запустить разделение стемов');
      }

      if (response?.error) {
        throw new Error(response.error);
      }

      if (!response?.success || !response?.taskId) {
        throw new Error('Сервис не вернул идентификатор задачи разделения стемов');
      }

      toast.success(
        mode === 'separate_vocal'
          ? 'Запущено разделение на вокал и инструментал'
          : 'Запущено инструментальное разделение трека'
      );

      toast.info(
        'Обработка займёт 30-180 секунд. Мы уведомим вас, когда стемы будут готовы.',
        { duration: 5000 }
      );

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ошибка при создании стемов';
      console.error('Error generating stems:', error);
      toast.error(message);
    } finally {
      setIsGenerating(false);
      setSelectedMode(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music4 className="w-5 h-5 text-primary" />
            Разделение на стемы
          </DialogTitle>
          <DialogDescription>
            {trackTitle && <span className="font-medium">"{trackTitle}"</span>}
            <br />
            Выберите режим разделения трека на отдельные элементы
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          {/* Базовое разделение */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-primary/50 hover:shadow-glow-primary",
              selectedMode === 'separate_vocal' && "border-primary ring-2 ring-primary/20"
            )}
            onClick={() => !isGenerating && setSelectedMode('separate_vocal')}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-primary/10">
                <Mic className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Вокал + Инструментал</h3>
                <p className="text-xs text-muted-foreground">
                  Разделить на 2 стема: чистый вокал и инструментальная часть
                </p>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerate('separate_vocal');
                }}
                disabled={isGenerating}
                className="w-full"
                variant={selectedMode === 'separate_vocal' ? 'default' : 'outline'}
              >
                {isGenerating && selectedMode === 'separate_vocal' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  'Разделить'
                )}
              </Button>
            </div>
          </Card>

          {/* Детальное разделение */}
          <Card
            className={cn(
              "p-4 cursor-pointer transition-all hover:border-secondary/50 hover:shadow-glow-secondary",
              selectedMode === 'split_stem' && "border-secondary ring-2 ring-secondary/20"
            )}
            onClick={() => !isGenerating && setSelectedMode('split_stem')}
          >
            <div className="flex flex-col items-center text-center gap-3">
              <div className="p-3 rounded-full bg-secondary/10">
                <Music className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">По инструментам</h3>
                <p className="text-xs text-muted-foreground">
                  Разделить на 8+ стемов: вокал, ударные, бас, гитара и др.
                </p>
              </div>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleGenerate('split_stem');
                }}
                disabled={isGenerating}
                className="w-full"
                variant={selectedMode === 'split_stem' ? 'default' : 'outline'}
              >
                {isGenerating && selectedMode === 'split_stem' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Генерация...
                  </>
                ) : (
                  'Разделить'
                )}
              </Button>
            </div>
          </Card>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          💡 Процесс обычно занимает от 30 секунд до 3 минут
        </p>
      </DialogContent>
    </Dialog>
  );
};
