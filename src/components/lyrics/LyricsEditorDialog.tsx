import React, { useState, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Sparkles } from 'lucide-react';
import { useTrackTitleGenerator } from '@/hooks/useTrackTitleGenerator';
import { saveLyrics } from '@/services/lyrics/lyricsService';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface LyricsEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId?: string;
  initialLyrics?: string;
  initialTitle?: string;
  onSaved?: (trackId: string, title: string) => void;
}

export const LyricsEditorDialog: React.FC<LyricsEditorDialogProps> = ({
  open,
  onOpenChange,
  trackId,
  initialLyrics = '',
  initialTitle = '',
  onSaved,
}) => {
  const [lyrics, setLyrics] = useState(initialLyrics);
  const [title, setTitle] = useState(initialTitle);
  const [isSaving, setIsSaving] = useState(false);
  
  const {
    generateTitle,
    isGenerating,
    generatedTitle,
  } = useTrackTitleGenerator();

  useEffect(() => {
    if (open) {
      setLyrics(initialLyrics);
      setTitle(initialTitle);
    }
  }, [open, initialLyrics, initialTitle]);

  const handleGenerateTitle = useCallback(async () => {
    if (!lyrics.trim()) {
      toast.error('Добавьте текст песни для генерации названия');
      return;
    }

    const result = await generateTitle({ lyrics });
    if (result) {
      setTitle(result.title);
      toast.success(`Сгенерировано название: "${result.title}"`);
    }
  }, [lyrics, generateTitle]);

  const handleSave = useCallback(async () => {
    if (!lyrics.trim()) {
      toast.error('Текст песни не может быть пустым');
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveLyrics(lyrics, {
        trackId,
        generateTitle: !title.trim(),
      });

      if (result.success) {
        toast.success(result.message);
        onSaved?.(result.trackId, result.title);
        onOpenChange(false);
      }
    } catch (error) {
      logger.error('Failed to save lyrics', error as Error, 'LyricsEditorDialog');
      toast.error('Не удалось сохранить текст');
    } finally {
      setIsSaving(false);
    }
  }, [lyrics, title, trackId, onSaved, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {trackId ? 'Редактировать текст' : 'Создать текст'}
          </DialogTitle>
          <DialogDescription>
            {trackId
              ? 'Отредактируйте текст песни и сохраните изменения'
              : 'Создайте новый трек с текстом песни'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Title Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title">Название</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleGenerateTitle}
                disabled={isGenerating || !lyrics.trim()}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                AI генерация
              </Button>
            </div>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введите название или используйте AI"
              disabled={isGenerating}
            />
            {generatedTitle && (
              <p className="text-xs text-muted-foreground">
                Сгенерировано: {generatedTitle}
              </p>
            )}
          </div>

          {/* Lyrics Textarea */}
          <div className="space-y-2">
            <Label htmlFor="lyrics">Текст песни</Label>
            <Textarea
              id="lyrics"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              placeholder="[Verse 1]&#10;Текст первого куплета...&#10;&#10;[Chorus]&#10;Текст припева..."
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Используйте теги: [Verse], [Chorus], [Bridge], [Outro]
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Отмена
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !lyrics.trim()}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
