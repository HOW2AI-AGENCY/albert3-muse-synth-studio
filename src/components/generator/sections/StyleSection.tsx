/**
 * Style Section Component
 * Handles style tags, genre, and mood selection
 */

import React from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { GeneratorSection } from './GeneratorSection';
import { cn } from '@/lib/utils';

interface StyleSectionProps {
  tags: string;
  onChange: (tags: string) => void;
  disabled?: boolean;
  className?: string;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export const StyleSection: React.FC<StyleSectionProps> = ({
  tags,
  onChange,
  disabled = false,
  className,
  suggestions = [],
  onSuggestionClick,
}) => {
  const tagArray = tags
    .split(',')
    .map(t => t.trim())
    .filter(Boolean);

  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tagArray.filter(t => t !== tagToRemove).join(', ');
    onChange(newTags);
  };

  return (
    <GeneratorSection
      title="Стили и теги"
      description="Добавьте теги стиля через запятую"
      className={className}
    >
      <div className="space-y-3">
        <Input
          value={tags}
          onChange={(e) => onChange(e.target.value)}
          placeholder="pop, energetic, upbeat"
          disabled={disabled}
          className="transition-all"
        />

        {/* Current tags */}
        {tagArray.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tagArray.map((tag, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className={cn(
                  'pl-2.5 pr-1.5 py-1 text-xs',
                  'transition-all hover:bg-secondary/80'
                )}
              >
                {tag}
                {!disabled && (
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1.5 hover:text-destructive transition-colors"
                    aria-label={`Remove ${tag}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </Badge>
            ))}
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Популярные теги:</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={cn(
                    'cursor-pointer text-xs',
                    'hover:bg-primary hover:text-primary-foreground transition-all',
                    tagArray.includes(suggestion) && 'opacity-50 pointer-events-none'
                  )}
                  onClick={() => onSuggestionClick?.(suggestion)}
                >
                  + {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </GeneratorSection>
  );
};
