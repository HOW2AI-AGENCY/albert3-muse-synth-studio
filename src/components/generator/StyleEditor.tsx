/**
 * StyleEditor Component
 *
 * Style and tags editor for music generation (left panel)
 * Includes textarea for styles and chip selector for tags
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useCallback, useState } from 'react';
import { X, Plus, Sparkles, RotateCcw } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { StyleEditorProps } from '@/types/suno-ui.types';

// Popular style suggestions
const DEFAULT_SUGGESTIONS = [
  'Electronic',
  'Lo-fi',
  'Jazz',
  'Rock',
  'Hip Hop',
  'Classical',
  'Ambient',
  'Pop',
  'R&B',
  'Indie',
  'Folk',
  'Metal',
  'Techno',
  'House',
  'Trap',
  'Reggae',
];

export const StyleEditor = memo<StyleEditorProps>(({
  styles,
  chips,
  onStylesChange,
  onChipsChange,
  onChipAdd,
  onChipRemove,
  suggestions = DEFAULT_SUGGESTIONS,
  maxChips = 10,
  disabled = false,
}) => {
  const [chipInput, setChipInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddChip = useCallback(() => {
    const trimmed = chipInput.trim();
    if (trimmed && !chips.includes(trimmed) && chips.length < maxChips) {
      onChipAdd(trimmed);
      setChipInput('');
    }
  }, [chipInput, chips, maxChips, onChipAdd]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddChip();
      }
    },
    [handleAddChip]
  );

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (!chips.includes(suggestion) && chips.length < maxChips) {
        onChipAdd(suggestion);
      }
    },
    [chips, maxChips, onChipAdd]
  );

  const handleClearAll = useCallback(() => {
    onChipsChange([]);
  }, [onChipsChange]);

  const handleResetStyles = useCallback(() => {
    onStylesChange('');
  }, [onStylesChange]);

  const filteredSuggestions = suggestions.filter(
    (s) => !chips.includes(s) && s.toLowerCase().includes(chipInput.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Styles Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="styles" className="text-sm font-semibold">
            Music Styles
          </Label>
          {styles && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleResetStyles}
                  disabled={disabled}
                >
                  <RotateCcw className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset styles</TooltipContent>
            </Tooltip>
          )}
        </div>
        <Textarea
          id="styles"
          value={styles}
          onChange={(e) => onStylesChange(e.target.value)}
          placeholder="Describe the musical style, genre, mood, instruments..."
          className={cn(
            'min-h-[120px] resize-none',
            'focus-visible:ring-2 focus-visible:ring-primary'
          )}
          disabled={disabled}
        />
        <p className="text-xs text-muted-foreground">
          Describe the desired style in natural language
        </p>
      </div>

      {/* Style Tags/Chips */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-semibold">Style Tags</Label>
          {chips.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleClearAll}
              disabled={disabled}
            >
              Clear All
            </Button>
          )}
        </div>

        {/* Selected Chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-3 rounded-lg bg-muted/30 border">
            {chips.map((chip, index) => (
              <Badge
                key={`${chip}-${index}`}
                variant="secondary"
                className={cn(
                  'h-7 px-3 gap-1.5 cursor-pointer hover:bg-primary/20',
                  'transition-colors'
                )}
              >
                <span>{chip}</span>
                <button
                  onClick={() => onChipRemove(chip)}
                  disabled={disabled}
                  className="hover:text-destructive"
                  aria-label={`Remove ${chip}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Chip Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={chipInput}
              onChange={(e) => setChipInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Add style tag..."
              disabled={disabled || chips.length >= maxChips}
              className="pr-8"
            />
            {chipInput && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-8"
                onClick={() => setChipInput('')}
              >
                <X className="w-3 h-3" />
              </Button>
            )}
          </div>
          <Button
            onClick={handleAddChip}
            disabled={!chipInput.trim() || disabled || chips.length >= maxChips}
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Tag Counter */}
        <p className="text-xs text-muted-foreground">
          {chips.length} / {maxChips} tags
        </p>

        {/* Suggestions */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="relative">
            <ScrollArea className="h-[200px] rounded-lg border bg-background p-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>Suggestions</span>
                </div>
                {filteredSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={disabled || chips.length >= maxChips}
                    className={cn(
                      'w-full text-left px-2 py-1.5 rounded text-sm',
                      'hover:bg-accent transition-colors',
                      'disabled:opacity-50 disabled:cursor-not-allowed'
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Quick Add Suggestions (always visible) */}
        {chips.length < maxChips && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Quick add:</div>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.slice(0, 8).map((suggestion) => {
                const isAdded = chips.includes(suggestion);
                return (
                  <Button
                    key={suggestion}
                    variant="outline"
                    size="sm"
                    className={cn(
                      'h-7 text-xs',
                      isAdded && 'opacity-50 cursor-not-allowed'
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={disabled || isAdded || chips.length >= maxChips}
                  >
                    {suggestion}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

StyleEditor.displayName = 'StyleEditor';
