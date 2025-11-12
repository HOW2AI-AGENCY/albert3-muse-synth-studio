import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Settings } from '@/utils/iconImports';

export interface LyricsSettings {
  fontSize: 'small' | 'medium' | 'large';
  scrollSpeed: number; // 1-10
  disableWordHighlight: boolean;
  highContrast: boolean;
}

interface LyricsSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: LyricsSettings;
  onSettingsChange: (settings: Partial<LyricsSettings>) => void;
}

export const LyricsSettingsDialog: React.FC<LyricsSettingsDialogProps> = ({
   open,
   onOpenChange,
   settings,
   onSettingsChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
            Настройки отображения лирики
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Настройте внешний вид синхронизированной лирики под свои предпочтения
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Font Size */}
          <div className="space-y-2">
            <Label htmlFor="fontSize" className="text-sm font-medium">
              Размер шрифта
            </Label>
            <Select
              value={settings.fontSize}
              onValueChange={(value) =>
                onSettingsChange({ fontSize: value as LyricsSettings['fontSize'] })
              }
            >
              <SelectTrigger id="fontSize" className="h-11 md:h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Маленький</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="large">Большой</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scroll Speed */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="scrollSpeed" className="text-sm font-medium">
                Скорость прокрутки
              </Label>
              <span className="text-xs text-muted-foreground">{settings.scrollSpeed}/10</span>
            </div>
            <Slider
              id="scrollSpeed"
              min={1}
              max={10}
              step={1}
              value={[settings.scrollSpeed]}
              onValueChange={([value]) => onSettingsChange({ scrollSpeed: value })}
              className="py-4"
            />
          </div>

          {/* Disable Word Highlight */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="disableWordHighlight" className="text-sm font-medium cursor-pointer">
              Отключить подсветку слов
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                Подсвечивать только текущую строку
              </span>
            </Label>
            <Switch
              id="disableWordHighlight"
              checked={settings.disableWordHighlight}
              onCheckedChange={(checked) =>
                onSettingsChange({ disableWordHighlight: checked })
              }
            />
          </div>

          {/* High Contrast Mode */}
          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="highContrast" className="text-sm font-medium cursor-pointer">
              Высокая контрастность
              <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                Улучшенная читаемость (WCAG AAA)
              </span>
            </Label>
            <Switch
              id="highContrast"
              checked={settings.highContrast}
              onCheckedChange={(checked) => onSettingsChange({ highContrast: checked })}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
