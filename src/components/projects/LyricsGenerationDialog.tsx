/**
 * Lyrics Generation Dialog
 * Modal for generating lyrics for project tracks
 * 
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { cn } from '@/lib/utils';

interface LyricsGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: any;
  projectId?: string;
}

export const LyricsGenerationDialog: React.FC<LyricsGenerationDialogProps> = ({
  open,
  onOpenChange,
  track,
  projectId,
}) => {
  const [prompt, setPrompt] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedLyrics, setGeneratedLyrics] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      toast.error('Введите промпт для генерации');
      return;
    }

    setIsGenerating(true);
    setGeneratedLyrics(null);

    try {
      const { data, error } = await SupabaseFunctions.invoke('generate-lyrics', {
        body: {
          prompt: prompt.trim(),
          trackId: track?.id,
          projectId,
        }
      });

      if (error) throw error;

      const result = data as any;
      if (result?.lyrics) {
        setGeneratedLyrics(result.lyrics);
        toast.success('Лирика сгенерирована');
      } else {
        throw new Error('Пустой ответ от сервера');
      }
    } catch (error) {
      console.error('Lyrics generation error:', error);
      toast.error('Ошибка генерации лирики');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, track, projectId]);

  const handleCopy = useCallback(async () => {
    if (!generatedLyrics) return;

    try {
      await navigator.clipboard.writeText(generatedLyrics);
      setIsCopied(true);
      toast.success('Лирика скопирована');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Ошибка копирования');
    }
  }, [generatedLyrics]);

  const handleApply = useCallback(async () => {
    if (!generatedLyrics || !track) return;

    try {
      const { error } = await supabase
        .from('tracks')
        .update({ lyrics: generatedLyrics })
        .eq('id', track.id);

      if (error) throw error;

      toast.success('Лирика применена к треку');
      onOpenChange(false);
    } catch (error) {
      console.error('Apply lyrics error:', error);
      toast.error('Ошибка применения лирики');
    }
  }, [generatedLyrics, track, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-2xl max-h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-4 sm:px-6 pt-4 pb-3 border-b">
          <DialogTitle className="text-base sm:text-lg">Генерация лирики</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {track ? `Трек: ${track.title}` : 'Создайте текст песни с помощью AI'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-4 sm:px-6">
          <div className="space-y-4 py-4">
            {/* ========== PROMPT INPUT ========== */}
            <div className="space-y-2">
              <Label htmlFor="lyrics-prompt" className="text-xs sm:text-sm">
                Промпт для генерации
              </Label>
              <Textarea
                id="lyrics-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Опишите тему, стиль, настроение песни...
Например: 'Романтическая баллада о первой любви, с нежными метафорами'..."
                className="min-h-[100px] text-xs sm:text-sm"
                disabled={isGenerating}
              />
              {track?.style_tags && track.style_tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground">Стиль трека:</span>
                  {track.style_tags.map((tag: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* ========== GENERATE BUTTON ========== */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Генерация...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Сгенерировать лирику
                </>
              )}
            </Button>

            {/* ========== GENERATED LYRICS ========== */}
            {generatedLyrics && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs sm:text-sm">Сгенерированная лирика</Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopy}
                      className="h-7 text-xs"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Скопировано
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 mr-1" />
                          Копировать
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <div className="relative">
                  <Textarea
                    value={generatedLyrics}
                    onChange={(e) => setGeneratedLyrics(e.target.value)}
                    className={cn(
                      "min-h-[300px] font-mono text-xs sm:text-sm",
                      "bg-muted/50 resize-none"
                    )}
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="default"
                    onClick={handleApply}
                    className="flex-1"
                  >
                    Применить к треку
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={isGenerating}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ========== TIPS ========== */}
            {!generatedLyrics && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <p className="text-xs font-medium">💡 Советы:</p>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Укажите жанр и настроение песни</li>
                  <li>Опишите основную тему или историю</li>
                  <li>Укажите желаемую структуру (куплет, припев, бридж)</li>
                  <li>Добавьте примеры метафор или образов</li>
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
