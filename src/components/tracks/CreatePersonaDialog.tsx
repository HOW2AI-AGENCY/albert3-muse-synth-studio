/**
 * Create Persona Dialog Component
 * Sprint 33.1: Persona Creation System
 */

import { memo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCreatePersona } from '@/hooks/useCreatePersona';

interface CreatePersonaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string;
  trackTitle: string;
}

export const CreatePersonaDialog = memo(({
  open,
  onOpenChange,
  trackId,
  trackTitle
}: CreatePersonaDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [musicIndex, setMusicIndex] = useState(0);
  const [isPublic, setIsPublic] = useState(false);
  
  const { createPersona, isCreating } = useCreatePersona();

  const handleSubmit = () => {
    if (!name.trim() || !description.trim()) {
      return;
    }

    createPersona({
      trackId,
      musicIndex,
      name: name.trim(),
      description: description.trim(),
      isPublic
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setName('');
        setDescription('');
        setMusicIndex(0);
        setIsPublic(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>🎤 Создать персону из трека</DialogTitle>
          <DialogDescription>
            Создайте AI-клон голоса из "{trackTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="persona-name">Название персоны *</Label>
            <Input
              id="persona-name"
              placeholder="Моя уникальная персона"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="persona-description">Описание *</Label>
            <Textarea
              id="persona-description"
              placeholder="Опишите стиль и характер голоса..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="music-index">Вариант трека</Label>
            <Input
              id="music-index"
              type="number"
              min={0}
              max={1}
              value={musicIndex}
              onChange={(e) => setMusicIndex(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              0 = первый вариант, 1 = второй вариант
            </p>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="persona-public">Публичная персона</Label>
            <Switch
              id="persona-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating}
          >
            Отмена
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !description.trim() || isCreating}
          >
            {isCreating ? 'Создание...' : 'Создать персону'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

CreatePersonaDialog.displayName = 'CreatePersonaDialog';
