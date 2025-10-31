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
          "relative w-full p-4 rounded-lg border-2 transition-all duration-200",
          "hover:border-primary hover:bg-accent/50 focus:outline-none focus:ring-2 focus:ring-primary",
          "text-left group",
          isCustom && "border-dashed"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
            <IconComponent className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1">{preset.name}</h4>
            <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
              {preset.description}
            </p>
            {preset.defaultTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {preset.defaultTags.map((tag, idx) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>

        {isCustom && (
          <div className="mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
            <Label htmlFor="custom-section-name" className="text-xs mb-1.5 block">
              Section Name
            </Label>
            <div className="flex gap-2">
              <Input
                id="custom-section-name"
                placeholder="e.g., Verse 3, Special Part..."
                value={customSectionName}
                onChange={(e) => setCustomSectionName(e.target.value)}
                className="h-8 text-sm"
              />
              <Button
                size="sm"
                onClick={() => handlePresetClick(preset)}
                disabled={!customSectionName.trim()}
                className="h-8"
              >
                Add
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
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Section
          </DialogTitle>
          <DialogDescription>
            Choose a section type from presets or create a custom one
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="structure" className="text-xs">
              <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
              Structure
            </TabsTrigger>
            <TabsTrigger value="common" className="text-xs">
              <Music className="h-3.5 w-3.5 mr-1.5" />
              Common
            </TabsTrigger>
            <TabsTrigger value="special" className="text-xs">
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Special
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[450px] mt-4">
            <TabsContent value="structure" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
                {structurePresets.map(renderPresetCard)}
              </div>
            </TabsContent>

            <TabsContent value="common" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
                {commonPresets.map(renderPresetCard)}
              </div>
            </TabsContent>

            <TabsContent value="special" className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-1">
                {specialPresets.map(renderPresetCard)}
              </div>
            </TabsContent>
          </ScrollArea>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
