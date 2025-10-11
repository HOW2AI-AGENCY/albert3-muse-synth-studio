import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUploadExtendAudio } from '@/hooks/useUploadExtendAudio';
import { AudioUploader } from '@/components/audio/AudioUploader';

interface UploadExtendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const UploadExtendDialog = ({ open, onOpenChange, onSuccess }: UploadExtendDialogProps) => {
  const { uploadExtendAudio, isExtending } = useUploadExtendAudio();
  
  const [uploadUrl, setUploadUrl] = useState('');
  const [defaultParamFlag, setDefaultParamFlag] = useState(true);
  const [instrumental, setInstrumental] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [continueAt, setContinueAt] = useState<number>(60);
  const [model, setModel] = useState<'V3_5' | 'V4' | 'V4_5' | 'V4_5PLUS' | 'V5'>('V4_5PLUS');

  const handleAudioUpload = async (url: string) => {
    setUploadUrl(url);
  };

  const handleSubmit = async () => {
    if (!uploadUrl) return;

    if (defaultParamFlag && (!style || !title || !continueAt)) {
      return;
    }

    await uploadExtendAudio({
      uploadUrl,
      defaultParamFlag,
      instrumental,
      prompt: !instrumental ? prompt : undefined,
      style: defaultParamFlag ? style : undefined,
      title: defaultParamFlag ? title : undefined,
      continueAt: defaultParamFlag ? continueAt : undefined,
      model
    });

    onSuccess?.();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setUploadUrl('');
    setPrompt('');
    setStyle('');
    setTitle('');
    setContinueAt(60);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Расширить аудио</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <AudioUploader 
            onUploadComplete={handleAudioUpload}
            onRemove={() => setUploadUrl('')}
          />

          <div className="flex items-center space-x-2">
            <Switch 
              checked={defaultParamFlag} 
              onCheckedChange={setDefaultParamFlag}
              id="default-param"
            />
            <Label htmlFor="default-param">Расширенные параметры</Label>
          </div>

          {defaultParamFlag && (
            <>
              <div>
                <Label>Название</Label>
                <Input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Extended Piano Track"
                />
              </div>

              <div>
                <Label>Стиль</Label>
                <Input 
                  value={style} 
                  onChange={(e) => setStyle(e.target.value)}
                  placeholder="Classical, Piano"
                />
              </div>

              <div>
                <Label>Продолжить с (секунды)</Label>
                <Input 
                  type="number"
                  value={continueAt} 
                  onChange={(e) => setContinueAt(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch 
                  checked={instrumental} 
                  onCheckedChange={setInstrumental}
                  id="instrumental"
                />
                <Label htmlFor="instrumental">Инструментал (без вокала)</Label>
              </div>

              {!instrumental && (
                <div>
                  <Label>Текст / Описание</Label>
                  <Textarea 
                    value={prompt} 
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Текст песни или описание..."
                    rows={4}
                  />
                </div>
              )}
            </>
          )}

          <div>
            <Label>Модель</Label>
            <Select value={model} onValueChange={(v: any) => setModel(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="V3_5">V3.5</SelectItem>
                <SelectItem value="V4">V4</SelectItem>
                <SelectItem value="V4_5">V4.5</SelectItem>
                <SelectItem value="V4_5PLUS">V4.5 Plus</SelectItem>
                <SelectItem value="V5">V5</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={handleSubmit} 
            disabled={isExtending || !uploadUrl}
            className="w-full"
          >
            {isExtending ? 'Обработка...' : 'Расширить аудио'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
