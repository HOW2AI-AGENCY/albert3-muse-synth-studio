import React, { useState, useMemo } from 'react';
import { TagCategory, Tag } from '@/types/lyrics';
import { TAG_DEFINITIONS } from '@/data/tagDefinitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  Music, Mic, Volume2, Headphones, Disc, Zap, Heart, 
  Sun, Moon, Cloud, Star, Sparkles, Flame, Droplet, Wind,
  Search, Plus, Info,
  type LucideIcon 
} from '@/utils/iconImports';
import { parseTag } from '@/utils/lyricsParser';
import { cn } from '@/lib/utils';

interface TagPaletteProps {
  onAddTag: (tag: Tag) => void;
  excludeCategories?: TagCategory[];
}

// Маппинг категорий на русский язык
const CATEGORY_LABELS: Record<string, string> = {
  vocal: 'Вокал',
  emotion: 'Эмоции',
  instrument: 'Инструменты',
  arrangement: 'Аранжировка',
  fx: 'Эффекты',
  tempo: 'Темп',
  key: 'Тональность',
  language: 'Язык',
  content: 'Контент',
  meta: 'Мастеринг'
};

// Группировка тегов для лучшей структуризации
const TAG_GROUPS: Record<string, Record<string, string[]>> = {
  vocal: {
    'Типы вокала': ['Lead Vocal', 'Backing Vocals', 'Stacked Harmonies', 'Call-and-Response', 'Duet', 'Choir', 'Spoken Word', 'Rap Verse', 'Acapella', 'Humming', 'Whistle', 'Scat Singing'],
    'Характер': ['Gritty', 'Husky', 'Breathy', 'Soulful', 'Belting', 'Falsetto', 'Whisper', 'Raspy', 'Smooth', 'Powerful', 'Melancholic Vocal', 'Euphoric Vocal', 'Intimate Vocal', 'Dark Vocal', 'Angelic', 'Raw Emotion', 'Operatic'],
    'Пол/Возраст': ['Male Vocals', 'Female Vocals', 'Child Voice', 'Elderly Voice', 'Deep Voice', 'High Pitched', 'Androgynous'],
    'Обработка': ['Light Autotune', 'Heavy Autotune', 'Vocoder', 'Double-Tracked', 'Lo-fi Vocal', 'Pitched Up', 'Pitched Down', 'Reverb Vocal', 'Delay Vocal', 'Distorted Vocal']
  },
  instrument: {
    'Ритм-секция': ['Drum Machine', 'Acoustic Drums', 'Breakbeat', 'Trap Hats', 'Four-on-the-Floor', 'Live Drums', 'Drum & Bass', 'Tribal Drums', '808 Sub', 'Fuzzy Bass', 'Slap Bass', 'Synth Bass', 'Upright Bass', 'Kick Drum', 'Snare', 'Hi-Hats', 'Clap'],
    'Клавишные': ['Piano', 'Rhodes', 'Organ', 'Hammond Organ', 'Wurlitzer', 'Electric Piano', 'Grand Piano', 'Upright Piano'],
    'Гитары': ['Acoustic Guitar', 'Electric Guitar Clean', 'Electric Guitar Crunch', 'Electric Guitar Distorted', 'Guitar Riff', 'Guitar Solo', 'Fingerpicked Guitar', 'Strummed Guitar', 'Bass Guitar'],
    'Оркестр': ['Strings', 'Brass', 'Woodwinds', 'Orchestra', 'Violin', 'Cello', 'Viola', 'Double Bass', 'Saxophone', 'Trumpet', 'Trombone', 'French Horn', 'Flute', 'Clarinet', 'Oboe', 'Bassoon'],
    'Этника': ['Accordion', 'Sitar', 'Banjo', 'Mandolin', 'Ukulele', 'Harp', 'Harmonica', 'Bagpipes', 'Steel Drum'],
    'Синтезаторы': ['Analog Pad', 'Ethereal Pad', 'Warm Pad', 'Dark Pad', 'Pluck Synth', 'Arp Synth', 'Lead Synth', 'Bass Synth', 'FM Keys', 'FM Bass', 'Chiptune Lead', '8-bit', 'Supersaw', 'Warm Bass', 'Sub Bass', 'Reese Bass']
  },
  fx: {
    'Реверберация': ['Reverb Heavy', 'Short Plate Reverb', 'Hall Reverb', 'Room Reverb'],
    'Дилей': ['Delay: dotted 1/4', 'Ping-Pong Delay', 'Tape Delay'],
    'Насыщение': ['Tape Saturation', 'Bitcrushed', 'Warm Saturation', 'Tube Warmth'],
    'Пространство': ['Sidechain Pump', 'Vinyl Crackle', 'Stutter FX', 'Datamosh', 'Glitch', 'Stereo Wide', 'Mono-Focused']
  }
};

export const TagPalette: React.FC<TagPaletteProps> = ({ 
  onAddTag, 
  excludeCategories = [] 
}) => {
  const [customTagValue, setCustomTagValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('vocal');

  const categories = Object.entries(TAG_DEFINITIONS).filter(
    ([key]) => !excludeCategories.includes(key as TagCategory)
  );

  const handleAddCustomTag = () => {
    if (!customTagValue.trim()) return;
    
    const tag = parseTag(customTagValue, `[${customTagValue}]`);
    if (tag) {
      onAddTag(tag);
      setCustomTagValue('');
    }
  };

  const filteredAndGroupedTags = useMemo(() => {
    const categoryData = categories.find(([key]) => key === selectedCategory);
    if (!categoryData) return null;

    const [key, def] = categoryData;
    const groups = TAG_GROUPS[key];

    if (!groups) {
      // Если нет группировки, возвращаем все теги одним списком
      const filtered = searchQuery
        ? def.values.filter(v => v.toLowerCase().includes(searchQuery.toLowerCase()))
        : def.values;
      
      return { ungrouped: filtered };
    }

    // Группированные теги с фильтрацией
    const result: Record<string, string[]> = {};
    Object.entries(groups).forEach(([groupName, values]) => {
      const filtered = searchQuery
        ? values.filter(v => v.toLowerCase().includes(searchQuery.toLowerCase()))
        : values;
      
      if (filtered.length > 0) {
        result[groupName] = filtered;
      }
    });

    return result;
  }, [selectedCategory, searchQuery, categories]);

  const iconMap: Record<string, LucideIcon> = {
    Music, Mic, Volume2, Headphones, Disc, Zap, Heart,
    Sun, Moon, Cloud, Star, Sparkles, Flame, Droplet, Wind
  };

  const renderTag = (value: string, categoryDef: any) => {
    const tag = parseTag(value, `[${value}]`);
    if (!tag) return null;
    
    const IconComponent = tag.icon ? iconMap[tag.icon] : null;

    return (
      <Tooltip key={value} delayDuration={300}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAddTag(tag)}
            className={cn(
              "h-auto min-h-[28px] sm:min-h-[32px] px-2 sm:px-3 py-1 sm:py-1.5",
              "text-[10px] sm:text-xs font-medium",
              "hover:scale-105 active:scale-95 transition-all duration-200",
              "border-2 hover:border-primary"
            )}
          >
            {IconComponent && <IconComponent className="mr-1 sm:mr-1.5 h-3 w-3 flex-shrink-0" />}
            <span className="truncate">{value}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-[200px] text-xs">
          <p className="font-semibold mb-1">{value}</p>
          {categoryDef.description && (
            <p className="text-muted-foreground text-[10px]">{categoryDef.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск тегов..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 sm:h-10 pl-9 text-sm"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <div className="relative -mx-1 px-1 pb-1.5">
          <div className="w-full overflow-x-auto scrollbar-minimal">
            <TabsList className="inline-flex w-auto min-w-full h-7 p-0.5 bg-muted/50 gap-0.5">
              {categories.map(([key, def]) => {
                const IconComponent = iconMap[def.icon] || Music;
                return (
                  <TabsTrigger 
                    key={key} 
                    value={key} 
                    className={cn(
                      "flex items-center gap-1 px-2 py-1",
                      "text-[10px] font-medium whitespace-nowrap flex-shrink-0 h-6",
                      "data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    )}
                  >
                    <IconComponent className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>{CATEGORY_LABELS[key] || key}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>
        </div>

        {/* Tag Content */}
        {categories.map(([key, def]) => (
          <TabsContent key={key} value={key} className="mt-3 sm:mt-4 space-y-0">
            <div className="h-[40vh] sm:h-[45vh] md:h-[50vh] overflow-y-auto scrollbar-styled pr-2">
              <div className="space-y-4 pb-2">
                {filteredAndGroupedTags && Object.entries(filteredAndGroupedTags).map(([groupName, values]) => (
                  <div key={groupName} className="space-y-2">
                    {groupName !== 'ungrouped' && (
                      <div className="flex items-center gap-2 pb-1 border-b">
                        <h4 className="text-xs sm:text-sm font-semibold text-muted-foreground">
                          {groupName}
                        </h4>
                        <Badge variant="secondary" className="text-[9px] sm:text-[10px] px-1.5 py-0">
                          {values.length}
                        </Badge>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {values.map(value => renderTag(value, def))}
                    </div>
                  </div>
                ))}

                {filteredAndGroupedTags && Object.keys(filteredAndGroupedTags).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Теги не найдены</p>
                    <p className="text-xs mt-1">Попробуйте другой запрос</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Custom Tag Input */}
      <div className="flex gap-2 pt-2 sm:pt-3 border-t">
        <Input
          placeholder="Свой тег (на английском)..."
          value={customTagValue}
          onChange={(e) => setCustomTagValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
          className="h-8 sm:h-9 text-xs sm:text-sm flex-1"
        />
        <Button 
          onClick={handleAddCustomTag} 
          size="sm" 
          className="h-8 sm:h-9 px-3 sm:px-4 text-xs sm:text-sm"
          disabled={!customTagValue.trim()}
        >
          <Plus className="h-3.5 w-3.5 sm:mr-1.5" />
          <span className="hidden sm:inline">Добавить</span>
        </Button>
      </div>

      {/* Info hint */}
      <div className="flex items-start gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg text-[10px] sm:text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" />
        <p className="leading-relaxed">
          <span className="font-semibold">Все теги в песне на английском.</span> Интерфейс на русском для удобства, но в финальном тексте будут только английские теги типа [Lead Vocal], [808 Sub] и т.д.
        </p>
      </div>
    </div>
  );
};
