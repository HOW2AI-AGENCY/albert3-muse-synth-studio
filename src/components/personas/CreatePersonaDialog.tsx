/**
 * @fileoverview Диалог создания Suno Persona из трека
 * @version 1.0.0
 * @since 2025-11-01
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles } from '@/utils/iconImports';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getAIDescription } from '@/types/track-metadata';
import type { TrackMetadata } from '@/types/track-metadata';

// ============================================================================
// TYPES
// ============================================================================

export interface CreatePersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: {
    id: string;
    title: string;
    cover_url?: string | null;
    style_tags?: string[] | null;
    lyrics?: string | null;
    prompt?: string | null;
    improved_prompt?: string | null;
    metadata?: TrackMetadata | null;
  };
  musicIndex?: number;
  onSuccess?: (persona: unknown) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export const CreatePersonaDialog = ({
  open,
  onOpenChange,
  track,
  musicIndex = 0,
  onSuccess,
}: CreatePersonaDialogProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Автоматически извлекаем стиль из трека при открытии
  useEffect(() => {
    if (open && track) {
      let styleDescription = '';

      // ПРИОРИТЕТ 1: AI-описание из metadata (автоматически синхронизировано из song_descriptions)
      const aiDesc = getAIDescription(track.metadata);
      if (aiDesc) {
        styleDescription = aiDesc;
      }
      // ПРИОРИТЕТ 2: Промпт, используемый при генерации
      else {
        styleDescription = track.improved_prompt || track.prompt || '';
      }

      setDescription(styleDescription);
      setName(track.title || '');
      setIsPublic(false);
    }
  }, [open, track]);

  // Улучшение описания через Suno boost-style
  const boostDescription = async () => {
    if (!description.trim()) {
      toast.error('Введите описание для улучшения');
      return;
    }

    setIsBoosting(true);
    try {
      const { data, error } = await supabase.functions.invoke('boost-style', {
        body: { content: description }
      });

      if (error) throw error;

      if (data?.result && typeof data.result === 'string' && data.result.trim()) {
        setDescription(data.result);
        toast.success('Описание улучшено через Suno AI');
      } else {
        throw new Error('Не удалось получить улучшенное описание');
      }
    } catch (error) {
      console.error('[BOOST-STYLE] Error:', error);
      toast.error('Ошибка улучшения описания');
    } finally {
      setIsBoosting(false);
    }
  };

  const handleCreate = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('Введите название персоны');
      return;
    }

    if (name.length > 100) {
      toast.error('Название слишком длинное (макс. 100 символов)');
      return;
    }

    if (!description.trim()) {
      toast.error('Введите описание персоны');
      return;
    }

    if (description.length > 500) {
      toast.error('Описание слишком длинное (макс. 500 символов)');
      return;
    }

    setIsCreating(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-suno-persona', {
        body: {
          trackId: track.id,
          musicIndex,
          name: name.trim(),
          description: description.trim(),
          isPublic,
        },
      });

      if (error) {
        console.error('[CREATE-PERSONA] Function error:', error);
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast.success('Персона успешно создана!', {
        description: `"${name}" теперь доступна для генерации музыки`,
      });

      onSuccess?.(data.persona);
      onOpenChange(false);

      // Reset form
      setName('');
      setDescription('');
      setIsPublic(false);
    } catch (error) {
      console.error('[CREATE-PERSONA] Error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Не удалось создать персону';

      if (errorMessage.includes('Persona already exists')) {
        toast.error('Персона уже существует', {
          description: 'Для этого трека уже создана персона',
        });
      } else if (errorMessage.includes('Insufficient')) {
        toast.error('Недостаточно кредитов Suno AI');
      } else {
        toast.error('Ошибка создания персоны', {
          description: errorMessage,
        });
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Создать музыкальную персону</DialogTitle>
          </div>
          <DialogDescription>
            Создайте персону из этого трека для генерации музыки в похожем стиле
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          {track.cover_url && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <img
                src={track.cover_url}
                alt={track.title}
                className="w-16 h-16 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{track.title}</p>
                {track.style_tags && track.style_tags.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {track.style_tags.join(', ')}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="persona-name">
              Название персоны <span className="text-destructive">*</span>
            </Label>
            <Input
              id="persona-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Например: Electronic Pop Singer"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              {name.length}/100 символов
            </p>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="persona-description">
                Описание стиля <span className="text-destructive">*</span>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={boostDescription}
                disabled={isBoosting || !description.trim()}
                className="h-7 text-xs"
              >
                {isBoosting ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Улучшение...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3 w-3 mr-1" />
                    Улучшить
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="persona-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите музыкальный стиль, характеристики, настроение..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {description.length}/500 символов
            </p>
          </div>

          {/* Public */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div className="space-y-0.5">
              <Label htmlFor="persona-public">Публичная персона</Label>
              <p className="text-xs text-muted-foreground">
                Разрешить другим пользователям использовать эту персону
              </p>
            </div>
            <Switch
              id="persona-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Отмена
          </Button>
          <Button type="button" onClick={handleCreate} disabled={isCreating}>
            {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Создать персону
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

CreatePersonaDialog.displayName = 'CreatePersonaDialog';