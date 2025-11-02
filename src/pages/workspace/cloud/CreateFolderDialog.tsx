/**
 * Create Folder Dialog
 * Диалог создания новой папки
 */

import { useState } from 'react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateFolder } from '@/hooks/useCloudFolders';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: string;
}

interface FormData {
  name: string;
  description: string;
  color: string;
}

const FOLDER_COLORS = [
  '#3b82f6', // blue
  '#10b981', // green
  '#f59e0b', // orange
  '#ef4444', // red
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#64748b', // gray
];

export function CreateFolderDialog({ open, onOpenChange, category }: CreateFolderDialogProps) {
  const [selectedColor, setSelectedColor] = useState(FOLDER_COLORS[0]);
  const createFolder = useCreateFolder();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    createFolder.mutate(
      {
        name: data.name,
        category,
        color: selectedColor,
        description: data.description || undefined,
      },
      {
        onSuccess: () => {
          reset();
          setSelectedColor(FOLDER_COLORS[0]);
          onOpenChange(false);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Создать папку</DialogTitle>
          <DialogDescription>
            Создайте новую папку для организации файлов
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Название папки</Label>
            <Input
              id="name"
              placeholder="Например: Мои семплы"
              {...register('name', { required: 'Введите название папки' })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Описание (опционально)</Label>
            <Textarea
              id="description"
              rows={3}
              placeholder="Краткое описание папки..."
              {...register('description')}
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Цвет папки</Label>
            <div className="flex gap-2">
              {FOLDER_COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    selectedColor === color
                      ? 'border-foreground scale-110'
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={createFolder.isPending}>
              {createFolder.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
