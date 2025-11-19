import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Save, Trash2, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

// Mock data and types that would normally come from ApiService/types
export interface Preset {
  id: string;
  name: string;
  prompts: any[]; // In a real scenario, this would be WeightedPrompt[]
}

interface PresetManagerProps {
  presets: Preset[];
  onSelectPreset: (preset: Preset) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
}

export const PresetManager: React.FC<PresetManagerProps> = ({
  presets,
  onSelectPreset,
  onSavePreset,
  onDeletePreset,
}) => {
  const [newPresetName, setNewPresetName] = useState('');

  const handleSave = () => {
    if (!newPresetName.trim()) {
      toast.error('Название пресета не может быть пустым');
      return;
    }
    onSavePreset(newPresetName);
    setNewPresetName('');
    toast.success(`Пресет "${newPresetName}" сохранен!`);
  };

  return (
    <div className="flex items-center gap-2 p-4 bg-card border rounded-lg">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex-1 justify-between">
            {presets.length > 0 ? 'Загрузить пресет' : 'Нет сохраненных пресетов'}
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56">
          <DropdownMenuLabel>Сохраненные пресеты</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {presets.map((preset) => (
            <DropdownMenuItem
              key={preset.id}
              className="flex justify-between items-center"
              onSelect={() => onSelectPreset(preset)}
            >
              <span>{preset.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeletePreset(preset.id);
                  toast.info(`Пресет "${preset.name}" удален.`);
                }}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="flex-1 flex gap-2">
        <Input
          type="text"
          placeholder="Название нового пресета..."
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
          className="bg-background"
        />
        <Button onClick={handleSave} disabled={!newPresetName.trim()}>
          <Save className="h-4 w-4 mr-2" />
          Сохранить
        </Button>
      </div>
    </div>
  );
};
