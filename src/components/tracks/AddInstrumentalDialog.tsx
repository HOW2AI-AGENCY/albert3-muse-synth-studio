import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAddInstrumental } from '@/hooks/useAddInstrumental';
import { AudioUploader } from '@/components/audio/AudioUploader';

interface AddInstrumentalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const AddInstrumentalDialog = ({ open, onOpenChange, onSuccess }: AddInstrumentalDialogProps) => {
  const { addInstrumental, isGenerating } = useAddInstrumental();
  
  const [uploadUrl, setUploadUrl] = useState('');
  const [title, setTitle] = useState('');
  const [tags, setTags] = useState('');
  const [negativeTags, setNegativeTags] = useState('');
  const [model, setModel] = useState<'V4_5PLUS' | 'V5'>('V4_5PLUS');

  const handleAudioUpload = async (url: string) => {
    setUploadUrl(url);
  };

  const handleSubmit = async () => {
    if (!uploadUrl || !title || !tags || !negativeTags) {
      return;
    }

    await addInstrumental({
      uploadUrl,
      title,
      tags,
      negativeTags,
      model
    });

    onSuccess?.();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setUploadUrl('');
    setTitle('');
    setTags('');
    setNegativeTags('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить инструментал к вокалу</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <AudioUploader 
            onUploadComplete={handleAudioUpload}
            onRemove={() => setUploadUrl('')}
          />

          <div>
            <Label>Название</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Vocal Track"
            />
          </div>

          <div>
            <Label>Стили (через запятую)</Label>
            <Input 
              value={tags} 
              onChange={(e) => setTags(e.target.value)}
              placeholder="Relaxing Piano, Ambient, Peaceful"
            />
          </div>

          <div>
            <Label>Исключить стили</Label>
            <Input 
              value={negativeTags} 
              onChange={(e) => setNegativeTags(e.target.value)}
              placeholder="Heavy Metal, Aggressive Drums"
            />
          </div>

          <div>
            <Label>Модель</Label>
            <Select value={model} onValueChange={(v: any) => setModel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="V4_5PLUS">V4.5 Plus</SelectItem>
                <SelectItem value="V5">V5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isGenerating || !uploadUrl || !title || !tags || !negativeTags}
            className="w-full"
          >
            {isGenerating ? 'Генерация...' : 'Создать инструментал'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
