import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export type MusicProvider = 'suno' | 'mureka';

interface ProviderSelectorProps {
  value: MusicProvider;
  onChange: (provider: MusicProvider) => void;
  disabled?: boolean;
}

export const ProviderSelector = ({ value, onChange, disabled }: ProviderSelectorProps) => {
  return (
    <div className="space-y-1">
      <Label htmlFor="provider" className="text-xs font-medium">
        AI Провайдер
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger id="provider" className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="suno">
            <div className="flex items-center gap-2">
              <span>Suno AI</span>
              <Badge variant="secondary" className="text-[9px] px-1 py-0">v5</Badge>
            </div>
          </SelectItem>
          <SelectItem value="mureka">
            <div className="flex items-center gap-2">
              <span>Mureka O1</span>
              <Badge variant="default" className="text-[9px] px-1 py-0">NEW</Badge>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground">
        {value === 'suno' ? 'Быстрая генерация, широкий выбор стилей' : 'Новая система с высоким качеством'}
      </p>
    </div>
  );
};
