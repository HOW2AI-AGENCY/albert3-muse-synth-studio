import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useAddVocal } from '@/hooks/useAddVocal';

interface AddVocalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trackId: string | null;
  trackAudioUrl?: string;
  trackTitle?: string;
  trackStyleTags?: string[];
  onSuccess?: () => void;
}

export const AddVocalDialog = ({ 
  open, 
  onOpenChange, 
  trackId, 
  trackAudioUrl = '',
  trackTitle = '',
  trackStyleTags = [],
  onSuccess 
}: AddVocalDialogProps) => {
  const { addVocal, isGenerating } = useAddVocal();
  
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState(`${trackTitle} (Vocal)`);
  const [style, setStyle] = useState(trackStyleTags.join(', ') || 'Pop');
  const [negativeTags, setNegativeTags] = useState('Heavy Metal, Aggressive');
  const [vocalGender, setVocalGender] = useState<'m' | 'f' | undefined>(undefined);
  const [model, setModel] = useState<'V4_5PLUS' | 'V5'>('V4_5PLUS');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Advanced settings
  const [styleWeight, setStyleWeight] = useState(0.5);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.5);
  const [audioWeight, setAudioWeight] = useState(0.65);

  const handleSubmit = async () => {
    if (!trackAudioUrl || !prompt || !title || !style) {
      return;
    }

    await addVocal({
      uploadUrl: trackAudioUrl,
      prompt,
      title,
      negativeTags,
      style,
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight,
      model,
      trackId: trackId || undefined
    });

    onSuccess?.();
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setPrompt('');
    setTitle(`${trackTitle} (Vocal)`);
    setStyle(trackStyleTags.join(', ') || 'Pop');
    setNegativeTags('Heavy Metal, Aggressive');
    setVocalGender(undefined);
    setModel('V4_5PLUS');
    setStyleWeight(0.5);
    setWeirdnessConstraint(0.5);
    setAudioWeight(0.65);
    setShowAdvanced(false);
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
            <Label>Концепция вокала *</Label>
            <Textarea 
              value={prompt} 
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A calm and relaxing piano track with soothing vocals..."
              rows={3}
            />
          </div>

          <div>
            <Label>Название трека *</Label>
            <Input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Track (Vocal)"
            />
          </div>

          <div>
            <Label>Стиль музыки *</Label>
            <Input 
              value={style} 
              onChange={(e) => setStyle(e.target.value)}
              placeholder="Pop, Jazz, Rock..."
            />
          </div>

          <div>
            <Label>Исключить стили</Label>
            <Input 
              value={negativeTags} 
              onChange={(e) => setNegativeTags(e.target.value)}
              placeholder="Heavy Metal, Aggressive Vocals..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Пол вокала</Label>
              <Select value={vocalGender || 'any'} onValueChange={(v) => setVocalGender(v === 'any' ? undefined : v as 'm' | 'f')}>
                <SelectTrigger>
                  <SelectValue placeholder="Любой" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Любой</SelectItem>
                  <SelectItem value="m">Мужской</SelectItem>
                  <SelectItem value="f">Женский</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Модель</Label>
              <Select value={model} onValueChange={(v) => setModel(v as 'V4_5PLUS' | 'V5')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="V4_5PLUS">V4.5 Plus</SelectItem>
                  <SelectItem value="V5">V5 (Latest)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Расширенные настройки</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-4">
              <div>
                <div className="flex justify-between mb-2">
                  <Label>Style Weight</Label>
                  <span className="text-sm text-muted-foreground">{styleWeight.toFixed(2)}</span>
                </div>
                <Slider 
                  value={[styleWeight]} 
                  onValueChange={(v) => setStyleWeight(v[0])}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Creativity</Label>
                  <span className="text-sm text-muted-foreground">{weirdnessConstraint.toFixed(2)}</span>
                </div>
                <Slider 
                  value={[weirdnessConstraint]} 
                  onValueChange={(v) => setWeirdnessConstraint(v[0])}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>

              <div>
                <div className="flex justify-between mb-2">
                  <Label>Audio Weight</Label>
                  <span className="text-sm text-muted-foreground">{audioWeight.toFixed(2)}</span>
                </div>
                <Slider 
                  value={[audioWeight]} 
                  onValueChange={(v) => setAudioWeight(v[0])}
                  min={0}
                  max={1}
                  step={0.01}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Button 
            onClick={handleSubmit} 
            disabled={isGenerating || !trackAudioUrl || !prompt || !title || !style}
            className="w-full"
          >
            {isGenerating ? 'Генерация...' : 'Создать вокальную версию'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
