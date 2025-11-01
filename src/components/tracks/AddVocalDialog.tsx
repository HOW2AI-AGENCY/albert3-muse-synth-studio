import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useAddVocal } from '@/hooks/useAddVocal';

interface AddVocalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string | null;
  onSuccess?: () => void;
}

export const AddVocalDialog = ({ open, onOpenChange, trackId, onSuccess }: AddVocalDialogProps) => {
  const { addVocal, isGenerating } = useAddVocal();
  
  const [vocalText, setVocalText] = useState('');
  const [vocalStyle, setVocalStyle] = useState('');

  const handleSubmit = async () => {
    if (!trackId) return;

    await addVocal({
      trackId,
      vocalText: vocalText.trim() || undefined,
      vocalStyle: vocalStyle.trim() || undefined
    });

    onSuccess?.();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setVocalText('');
    setVocalStyle('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Добавить вокал к инструменталу</DialogTitle>
          <DialogDescription>
            Создайте вокальную дорожку для вашего инструментального трека
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Текст вокала (опционально)</Label>
            <Textarea 
              value={vocalText} 
              onChange={(e) => setVocalText(e.target.value)}
              placeholder="Введите текст песни или оставьте пустым для авто-генерации..."
              rows={6}
            />
          </div>

          <div>
            <Label>Стиль вокала (опционально)</Label>
            <Input 
              value={vocalStyle} 
              onChange={(e) => setVocalStyle(e.target.value)}
              placeholder="Pop, Rock, Jazz..."
            />
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isGenerating || !trackId}
            className="w-full"
          >
            {isGenerating ? 'Генерация...' : 'Создать вокальную версию'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
