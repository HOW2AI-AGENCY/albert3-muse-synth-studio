/**
 * ✏️ Prompt Dialog Component
 * Диалог создания/редактирования промпта
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreatePrompt, useUpdatePrompt, type ProjectPrompt, type PromptCategory } from '@/hooks/useProjectPrompts';

interface PromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  prompt?: ProjectPrompt;
}

interface FormData {
  title: string;
  content: string;
  category: PromptCategory;
  tags: string;
}

export function PromptDialog({ open, onOpenChange, projectId, prompt }: PromptDialogProps) {
  const isEdit = !!prompt;
  const createPrompt = useCreatePrompt();
  const updatePrompt = useUpdatePrompt();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      title: '',
      content: '',
      category: 'general',
      tags: '',
    },
  });

  const category = watch('category');

  useEffect(() => {
    if (prompt) {
      reset({
        title: prompt.title,
        content: prompt.content,
        category: prompt.category || 'general',
        tags: prompt.tags?.join(', ') || '',
      });
    } else {
      reset({
        title: '',
        content: '',
        category: 'general',
        tags: '',
      });
    }
  }, [prompt, reset]);

  const onSubmit = async (data: FormData) => {
    const tags = data.tags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (isEdit) {
      updatePrompt.mutate(
        {
          id: prompt.id,
          updates: {
            title: data.title,
            content: data.content,
            category: data.category,
            tags,
          },
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        }
      );
    } else {
      createPrompt.mutate(
        {
          project_id: projectId,
          title: data.title,
          content: data.content,
          category: data.category,
          tags,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
            reset();
          },
        }
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Редактировать промпт' : 'Создать промпт'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Обновите информацию о промпте'
              : 'Создайте новый промпт для быстрого использования'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              placeholder="Например: Энергичный EDM промпт"
              {...register('title', { required: 'Введите название' })}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Content */}
          <div className="space-y-2">
            <Label htmlFor="content">Промпт</Label>
            <Textarea
              id="content"
              rows={6}
              placeholder="Введите текст промпта..."
              {...register('content', { required: 'Введите промпт' })}
            />
            {errors.content && (
              <p className="text-sm text-destructive">{errors.content.message}</p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Категория</Label>
            <Select
              value={category}
              onValueChange={(value) => setValue('category', value as PromptCategory)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="music">Музыка</SelectItem>
                <SelectItem value="lyrics">Текст</SelectItem>
                <SelectItem value="style">Стиль</SelectItem>
                <SelectItem value="concept">Концепт</SelectItem>
                <SelectItem value="general">Общее</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label htmlFor="tags">Теги</Label>
            <Input
              id="tags"
              placeholder="edm, энергичный, танцевальный (через запятую)"
              {...register('tags')}
            />
            <p className="text-xs text-muted-foreground">
              Укажите теги через запятую для удобного поиска
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={createPrompt.isPending || updatePrompt.isPending}
            >
              {isEdit ? 'Сохранить' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
