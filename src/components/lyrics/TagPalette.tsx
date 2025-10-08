import React, { useState } from 'react';
import { TagCategory, Tag } from '@/types/lyrics';
import { TAG_DEFINITIONS } from '@/data/tagDefinitions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import * as LucideIcons from 'lucide-react';
import { parseTag } from '@/utils/lyricsParser';

interface TagPaletteProps {
  onAddTag: (tag: Tag) => void;
  excludeCategories?: TagCategory[];
}

export const TagPalette: React.FC<TagPaletteProps> = ({ 
  onAddTag, 
  excludeCategories = [] 
}) => {
  const [customTagValue, setCustomTagValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredValues = (values: string[]) => {
    if (!searchQuery) return values;
    return values.filter(v => 
      v.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search tags..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="h-10"
      />

      <Tabs defaultValue={categories[0]?.[0] || 'vocal'} className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="inline-flex w-full min-w-max">
            {categories.map(([key, def]) => {
              const IconComponent = LucideIcons[def.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>;
              return (
                <TabsTrigger key={key} value={key} className="flex items-center gap-2">
                  {IconComponent && <IconComponent className="h-4 w-4" />}
                  <span className="capitalize">{key}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </ScrollArea>

        {categories.map(([key, def]) => (
          <TabsContent key={key} value={key} className="mt-4">
            <ScrollArea className="h-[200px]">
              <div className="flex flex-wrap gap-2 p-1">
                {filteredValues(def.values).map((value) => {
                  const tag = parseTag(value, `[${value}]`);
                  if (!tag) return null;
                  
                  const IconComponent = tag.icon 
                    ? (LucideIcons[tag.icon as keyof typeof LucideIcons] as React.ComponentType<{ className?: string }>)
                    : null;

                  return (
                    <Button
                      key={value}
                      variant="outline"
                      size="sm"
                      onClick={() => onAddTag(tag)}
                      className="h-8 text-xs"
                      title={def.description}
                    >
                      {IconComponent && <IconComponent className="mr-1.5 h-3 w-3" />}
                      {value}
                    </Button>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex gap-2 pt-2 border-t">
        <Input
          placeholder="Custom tag..."
          value={customTagValue}
          onChange={(e) => setCustomTagValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
          className="h-9"
        />
        <Button onClick={handleAddCustomTag} size="sm" className="h-9">
          Add
        </Button>
      </div>
    </div>
  );
};
