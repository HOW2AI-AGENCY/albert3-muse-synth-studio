import { useState, useMemo, useId } from "react";
import { Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface TagSelectorProps {
  recommendedTags: string[];
  currentTags: string[];
  onApply: (selectedTags: string[]) => void;
  onSelectAll?: () => void;
  disabled?: boolean;
  className?: string;
}

export function TagSelector({
  recommendedTags,
  currentTags,
  onApply,
  onSelectAll,
  disabled = false,
  className
}: TagSelectorProps) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const descriptionId = useId();
  const statusId = useId();

  // Normalize tags for comparison
  const normalizedCurrentTags = useMemo(
    () => new Set(currentTags.map(t => t.toLowerCase().trim())),
    [currentTags]
  );

  // Categorize tags
  const { newTags, existingTags } = useMemo(() => {
    const newTags: string[] = [];
    const existingTags: string[] = [];

    recommendedTags.forEach(tag => {
      if (normalizedCurrentTags.has(tag.toLowerCase().trim())) {
        existingTags.push(tag);
      } else {
        newTags.push(tag);
      }
    });

    return { newTags, existingTags };
  }, [recommendedTags, normalizedCurrentTags]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedTags(new Set(newTags));
    onSelectAll?.();
  };

  const handleApply = () => {
    if (selectedTags.size > 0) {
      onApply(Array.from(selectedTags));
      setSelectedTags(new Set());
    }
  };

  const allNewSelected = newTags.length > 0 && newTags.every(tag => selectedTags.has(tag));

  return (
    <div 
      className={cn("space-y-4", className)}
      role="region"
      aria-labelledby={descriptionId}
    >
      {/* Screen reader description */}
      <div id={descriptionId} className="sr-only">
        Выбор тегов для применения к треку. {newTags.length} новых тегов доступно, {existingTags.length} уже добавлено.
      </div>

      {/* Live region for status updates */}
      <div 
        id={statusId}
        role="status" 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {selectedTags.size > 0 && `Выбрано ${selectedTags.size} тегов для добавления`}
      </div>
      {/* Tag List with WCAG AA touch targets */}
      <div 
        className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-styled pr-2"
        role="group"
        aria-label="Список доступных тегов"
      >
        {newTags.map(tag => {
          const isSelected = selectedTags.has(tag);
          
          return (
            <div
              key={tag}
              className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-lg border transition-all",
                "hover:bg-accent/50 cursor-pointer min-h-[44px]", // WCAG AA touch target
                "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
                isSelected && "border-primary/40 bg-primary/5"
              )}
              onClick={() => !disabled && toggleTag(tag)}
              role="option"
              aria-selected={isSelected}
              aria-label={`Тег ${tag}, ${isSelected ? 'выбран' : 'не выбран'}`}
            >
              <div className="flex items-center gap-3 flex-1 min-h-[44px]">
                <Checkbox
                  checked={isSelected}
                  disabled={disabled}
                  onCheckedChange={() => toggleTag(tag)}
                  onClick={(e) => e.stopPropagation()}
                  aria-label={`Выбрать тег ${tag}`}
                  className="min-w-[20px] min-h-[20px]"
                />
                <Badge variant="default" className="text-xs">
                  {tag}
                </Badge>
              </div>
              <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400">
                Новый
              </Badge>
            </div>
          );
        })}

        {existingTags.map(tag => (
          <div
            key={tag}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-muted bg-muted/30 opacity-60 min-h-[44px]"
            role="option"
            aria-selected={false}
            aria-disabled={true}
            aria-label={`Тег ${tag} уже добавлен`}
          >
            <div className="flex items-center gap-3 flex-1">
              <Check className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">
                {tag}
              </Badge>
            </div>
            <span className="text-xs text-muted-foreground">
              Уже добавлен
            </span>
          </div>
        ))}
      </div>

      {/* Preview Summary */}
      {selectedTags.size > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 border space-y-2">
          <p className="text-sm font-medium">Будет добавлено:</p>
          <div className="flex flex-wrap gap-1.5">
            {Array.from(selectedTags).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons - Mobile-first responsive */}
      <div 
        className="flex flex-col sm:flex-row gap-2"
        role="group"
        aria-label="Действия с тегами"
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={disabled || newTags.length === 0 || allNewSelected}
          className="w-full sm:w-auto min-h-[44px] touch-manipulation"
          aria-label={`Выбрать все ${newTags.length} новых тегов`}
        >
          Выбрать все ({newTags.length})
        </Button>
        
        <Button
          size="sm"
          onClick={handleApply}
          disabled={disabled || selectedTags.size === 0}
          className="flex-1 min-h-[44px] touch-manipulation"
          aria-label={selectedTags.size > 0 
            ? `Применить ${selectedTags.size} выбранных тегов` 
            : 'Выберите теги для применения'
          }
          aria-describedby={selectedTags.size > 0 ? statusId : undefined}
        >
          Применить {selectedTags.size > 0 && `(${selectedTags.size})`}
        </Button>
      </div>
    </div>
  );
}
