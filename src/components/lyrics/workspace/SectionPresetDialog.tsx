import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Section } from '@/types/lyrics';
import { SECTION_PRESETS, SectionPreset } from '@/types/lyricsPresets';
import {
  Plus,
  Play,
  FileText,
  TrendingUp,
  Music,
  ChevronDown,
  GitBranch,
  Circle,
  Layers,
  BarChart3,
  ChevronLeft,
  Music2,
  Mic,
  Pause,
  Edit2,
  Sparkles,
  LayoutGrid
} from '@/utils/iconImports';
import { cn } from '@/lib/utils';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  'play': Play,
  'file-text': FileText,
  'trending-up': TrendingUp,
  'music': Music,
  'chevron-down': ChevronDown,
  'git-branch': GitBranch,
  'octagon': Circle,
  'anchor': Layers,
  'minus-circle': ChevronLeft,
  'bar-chart-3': BarChart3,
  'chevrons-down': ChevronDown,
  'music-2': Music2,
  'guitar': Music2,
  'pause': Pause,
  'mic': Mic,
  'sparkles': Sparkles,
  'edit-3': Edit2
};

interface SectionPresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPreset: (section: Section) => void;
}

export const SectionPresetDialog: React.FC<SectionPresetDialogProps> = ({
  open,
  onOpenChange,
  onSelectPreset,
}) => {
  const [customSectionName, setCustomSectionName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'structure' | 'common' | 'special'>('structure');

  const handlePresetClick = (preset: SectionPreset) => {
    const isCustom = preset.id === 'custom';
    const sectionTitle = isCustom && customSectionName.trim() 
      ? customSectionName.trim() 
      : preset.name;

    const newSection: Section = {
      id: `section-${Date.now()}`,
      title: sectionTitle,
      tags: [], // Tags will be added separately
      lines: preset.placeholderLines,
      order: 0 // Will be set by parent
    };

    onSelectPreset(newSection);
    onOpenChange(false);
    setCustomSectionName('');
  };

  const renderPresetCard = (preset: SectionPreset) => {
    const IconComponent = ICON_MAP[preset.icon] || FileText;
    const isCustom = preset.id === 'custom';

    return (
      <button
        key={preset.id}
        onClick={() => !isCustom && handlePresetClick(preset)}
        className={cn(
          "relative w-full p-3 sm:p-4 rounded-lg border-2 transition-all duration-200",
          "hover:border-primary hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary",
          "text-left group active:scale-[0.98]",
          isCustom && "border-dashed"
        )}
      >
        <div className="flex items-start gap-2 sm:gap-3">
          <div className="p-1.5 sm:p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors flex-shrink-0">
            <IconComponent className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-xs sm:text-sm mb-0.5 sm:mb-1">{preset.name}</h4>
            <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">
              {preset.description}
            </p>
            {preset.defaultTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
                {preset.defaultTags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {isCustom && (
          <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t" onClick={(e) => e.stopPropagation()}>
            <Label htmlFor="custom-section-name" className="text-[10px] sm:text-xs mb-1 sm:mb-1.5 block">
              Название секции
            </Label>
            <div className="flex gap-2">
              <Input
                id="custom-section-name"
                placeholder="Например: Verse 3, Outro..."
                value={customSectionName}
                onChange={(e) => setCustomSectionName(e.target.value)}
                className="h-7 sm:h-8 text-xs sm:text-sm"
              />
              <Button
                size="sm"
                onClick={() => handlePresetClick(preset)}
                disabled={!customSectionName.trim()}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs"
              >
                Добавить
              </Button>
            </div>
          </div>
        )}
      </button>
    );
  };

  const structurePresets = SECTION_PRESETS.filter(p => p.category === 'structure');
  const commonPresets = SECTION_PRESETS.filter(p => p.category === 'common');
  const specialPresets = SECTION_PRESETS.filter(p => p.category === 'special');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] sm:max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            Добавить секцию
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Выберите тип секции из пресетов или создайте свою
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-9 sm:h-10">
            <TabsTrigger value="structure" className="text-[10px] sm:text-xs px-1 sm:px-3">
              <LayoutGrid className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Структура</span>
            </TabsTrigger>
            <TabsTrigger value="common" className="text-[10px] sm:text-xs px-1 sm:px-3">
              <Music className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Общие</span>
            </TabsTrigger>
            <TabsTrigger value="special" className="text-[10px] sm:text-xs px-1 sm:px-3">
              <Sparkles className="h-3 w-3 sm:h-3.5 sm:w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Особые</span>
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(85vh-180px)] sm:h-[450px] mt-3 sm:mt-4">
            <TabsContent value="structure" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1">
                {structurePresets.map(renderPresetCard)}
              </div>
            </TabsContent>

            <TabsContent value="common" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1">
                {commonPresets.map(renderPresetCard)}
              </div>
            </TabsContent>

            <TabsContent value="special" className="mt-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 p-1">
                {specialPresets.map(renderPresetCard)}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
