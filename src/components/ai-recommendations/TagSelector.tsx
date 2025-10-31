import { useState, useMemo } from "react";
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
    <div className={cn("space-y-4", className)}>
      {/* Tag List */}
      <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-styled pr-2">
        {newTags.map(tag => {
          const isSelected = selectedTags.has(tag);
          
          return (
            <div
              key={tag}
              className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-lg border transition-all",
                "hover:bg-accent/50 cursor-pointer",
                isSelected && "border-primary/40 bg-primary/5"
              )}
              onClick={() => !disabled && toggleTag(tag)}
            >
              <div className="flex items-center gap-3 flex-1">
                <Checkbox
                  checked={isSelected}
                  disabled={disabled}
                  onCheckedChange={() => toggleTag(tag)}
                  onClick={(e) => e.stopPropagation()}
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
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-muted bg-muted/30 opacity-60"
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

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSelectAll}
          disabled={disabled || newTags.length === 0 || allNewSelected}
          className="w-full sm:w-auto"
        >
          Выбрать все ({newTags.length})
        </Button>
        
        <Button
          size="sm"
          onClick={handleApply}
          disabled={disabled || selectedTags.size === 0}
          className="flex-1"
        >
          Применить {selectedTags.size > 0 && `(${selectedTags.size})`}
        </Button>
      </div>
    </div>
  );
}
