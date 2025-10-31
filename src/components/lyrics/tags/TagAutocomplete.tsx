import React, { useMemo } from 'react';
import { Tag } from '@/types/lyrics';
import { TAG_DEFINITIONS } from '@/data/tagDefinitions';
import { parseTag } from '@/utils/lyricsParser';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TagAutocompleteProps {
  onSelect: (tag: Tag) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  className?: string;
}

export const TagAutocomplete: React.FC<TagAutocompleteProps> = ({
  onSelect,
  open,
  onOpenChange,
  searchQuery,
  className
}) => {
  // Filter tags based on search query
  const filteredTags = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const results: { category: string; tags: Tag[] }[] = [];

    Object.entries(TAG_DEFINITIONS).forEach(([category, definition]) => {
      const matchingValues = definition.values.filter(value =>
        value.toLowerCase().includes(query)
      );

      if (matchingValues.length > 0) {
        const tags = matchingValues.map(value => {
          const tag = parseTag(value, `[${value}]`);
          return tag!;
        }).filter(Boolean);

        results.push({
          category,
          tags
        });
      }
    });

    return results;
  }, [searchQuery]);

  const handleSelect = (tag: Tag) => {
    onSelect(tag);
    onOpenChange(false);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <div className={cn("w-0 h-0 overflow-hidden", className)} />
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search tags..." value={searchQuery} />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            {filteredTags.map(({ category, tags }) => (
              <CommandGroup key={category} heading={category}>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.value}
                    onSelect={() => handleSelect(tag)}
                    className="flex items-center gap-2"
                  >
                    <Badge
                      variant="secondary"
                      className={cn("text-xs", tag.color)}
                    >
                      {tag.value}
                    </Badge>
                    {tag.description && (
                      <span className="text-xs text-muted-foreground">
                        {tag.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
