import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MusicProvider } from '@/services/providers/types';
import { PROVIDERS } from '@/services/providers/registry';

interface ProviderSelectorProps {
  value: MusicProvider;
  onChange: (provider: MusicProvider) => void;
  disabled?: boolean;
}

const providerDescriptions: Record<MusicProvider, string> = {
  suno: 'Быстрая генерация, широкий выбор стилей, stem separation',
  mureka: 'AI-описание треков, распознавание песен, высокое качество',
  sonauto: 'Самая быстрая генерация, плавные переходы, низкая стоимость',
};

const providerBadges: Record<MusicProvider, { text: string; variant: 'default' | 'secondary' | 'outline' }> = {
  suno: { text: 'v5', variant: 'secondary' },
  mureka: { text: 'AI+', variant: 'default' },
  sonauto: { text: 'Fast', variant: 'outline' },
};

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
          {(Object.keys(PROVIDERS) as MusicProvider[]).map((provider) => {
            const config = PROVIDERS[provider];
            const badge = providerBadges[provider];
            
            return (
              <SelectItem key={provider} value={provider}>
                <div className="flex items-center gap-2">
                  <span>{config.displayName}</span>
                  <Badge variant={badge.variant} className="text-[9px] px-1 py-0">
                    {badge.text}
                  </Badge>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      <p className="text-[10px] text-muted-foreground">
        {providerDescriptions[value]}
      </p>
    </div>
  );
};
