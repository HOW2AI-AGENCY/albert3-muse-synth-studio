/**
 * Track Lyrics View Dialog
 * Просмотр и редактирование лирики трека
 */

import React, { useState, useEffect } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Edit3, 
  Save, 
  X, 
  Copy, 
  Check, 
  Sparkles,
  FileText,
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SupabaseFunctions } from "@/integrations/supabase/functions";
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import { logger } from '@/utils/logger';

type Track = Database['public']['Tables']['tracks']['Row'];

interface TrackLyricsViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Track | null;
  onLyricsUpdated?: () => void;
}

export const TrackLyricsViewDialog: React.FC<TrackLyricsViewDialogProps> = ({
  open,
  onOpenChange,
  track,
  onLyricsUpdated,
}) => {
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editedLyrics, setEditedLyrics] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [showAIEdit, setShowAIEdit] = useState(false);
  const [aiPrompt, setAIPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (track?.lyrics) {
      setEditedLyrics(track.lyrics);
    }
  }, [track?.lyrics]);

  const handleSave = async () => {
    if (!track) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('tracks')
        .update({ lyrics: editedLyrics })
        .eq('id', track.id);

      if (error) throw error;

      toast({
        title: 'Лирика сохранена',
        description: 'Изменения успешно сохранены',
      });

      setIsEditing(false);
      onLyricsUpdated?.();
    } catch (error) {
      logger.error('Failed to save lyrics', error instanceof Error ? error : undefined, 'TrackLyricsViewDialog', {
        trackId: track.id,
      });
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить лирику',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!track?.lyrics) return;

    try {
      await navigator.clipboard.writeText(track.lyrics);
      setIsCopied(true);
      toast({
        title: 'Скопировано',
        description: 'Лирика скопирована в буфер обмена',
      });

      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy lyrics', error instanceof Error ? error : undefined, 'TrackLyricsViewDialog');
      toast({
        title: 'Ошибка',
        description: 'Не удалось скопировать текст',
        variant: 'destructive',
      });
    }
  };

  const handleAIEdit = async () => {
    if (!track || !aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      const { data, error } = await SupabaseFunctions.invoke('generate-lyrics-ai', {
        body: {
          prompt: `${aiPrompt}\n\nОригинальный текст для редактирования:\n${track.lyrics}`,
          trackId: track.id,
        },
      });

      if (error) throw error;

      if (data?.lyrics) {
        setEditedLyrics(data.lyrics);
        setShowAIEdit(false);
        setAIPrompt('');
        toast({
          title: 'Лирика обновлена',
          description: 'AI внёс изменения в текст',
        });
        onLyricsUpdated?.();
      }
    } catch (error: any) {
      logger.error('Failed to edit lyrics with AI', error instanceof Error ? error : undefined, 'TrackLyricsViewDialog', {
        trackId: track.id,
      });
      toast({
        title: 'Ошибка',
        description: error.message || 'Не удалось отредактировать лирику',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancel = () => {
    setEditedLyrics(track?.lyrics || '');
    setIsEditing(false);
    setShowAIEdit(false);
    setAIPrompt('');
  };

  if (!track) return null;

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const lineCount = track.lyrics?.split('\n').length || 0;
  const wordCount = track.lyrics?.split(/\s+/).filter(Boolean).length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] p-0 flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-2xl mb-2">{track.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-4 flex-wrap">
                <span className="flex items-center gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  {lineCount} строк
                </span>
                <span className="flex items-center gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5" />
                  {wordCount} слов
                </span>
                {track.updated_at && (
                  <span className="flex items-center gap-1.5 text-xs">
                    <Clock className="h-3.5 w-3.5" />
                    {formatDate(track.updated_at)}
                  </span>
                )}
              </DialogDescription>
            </div>
            <Badge variant={track.lyrics ? 'default' : 'secondary'} className="flex-shrink-0">
              {track.lyrics ? 'Черновик' : 'Пусто'}
            </Badge>
          </div>
        </DialogHeader>

        <Separator />

        {/* AI Edit Form */}
        {showAIEdit && (
          <div className="px-6 py-4 bg-primary/5 border-b animate-fade-in">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">
                    Опишите, что нужно изменить
                  </label>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAIPrompt(e.target.value)}
                    placeholder="Например: Сделать текст более оптимистичным, добавить больше метафор..."
                    className="min-h-[80px] resize-none"
                    disabled={isGenerating}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleAIEdit}
                    disabled={isGenerating || !aiPrompt.trim()}
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    {isGenerating ? 'Редактирование...' : 'Применить изменения'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setShowAIEdit(false);
                      setAIPrompt('');
                    }}
                    disabled={isGenerating}
                  >
                    Отмена
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lyrics Content */}
        <ScrollArea className="flex-1 px-6">
          <div className="py-4">
            {isEditing ? (
              <Textarea
                value={editedLyrics}
                onChange={(e) => setEditedLyrics(e.target.value)}
                className="min-h-[400px] font-mono text-sm leading-relaxed resize-none"
                placeholder="Введите текст песни..."
              />
            ) : (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {track.lyrics ? (
                  <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed bg-muted/30 rounded-lg p-4">
                    {track.lyrics}
                  </pre>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>Текст песни отсутствует</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <Separator />
        <DialogFooter className="px-6 py-4">
          {isEditing ? (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1.5" />
                Отмена
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving || editedLyrics === track.lyrics}
              >
                <Save className="h-4 w-4 mr-1.5" />
                {isSaving ? 'Сохранение...' : 'Сохранить'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                disabled={!track.lyrics}
              >
                {isCopied ? (
                  <>
                    <Check className="h-4 w-4 mr-1.5" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-1.5" />
                    Копировать
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAIEdit(!showAIEdit)}
                disabled={!track.lyrics}
              >
                <Sparkles className="h-4 w-4 mr-1.5" />
                Редактировать с AI
              </Button>
              <Button
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit3 className="h-4 w-4 mr-1.5" />
                Редактировать
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
