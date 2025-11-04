import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptDiffViewProps {
  originalPrompt: string;
  enhancedPrompt: string;
  editedPrompt?: string;
  onEdit?: (value: string) => void;
  readonly?: boolean;
  className?: string;
}

export const PromptDiffView = ({
  originalPrompt,
  enhancedPrompt,
  editedPrompt,
  onEdit,
  readonly = false,
  className
}: PromptDiffViewProps) => {
  const displayedPrompt = editedPrompt ?? enhancedPrompt;

  // Extract what AI added (simple heuristic)
  const additions = useMemo(() => {
    const original = originalPrompt.toLowerCase().split(/\s+/);
    const enhanced = displayedPrompt.toLowerCase().split(/\s+/);
    
    const addedWords = enhanced.filter(word => 
      !original.includes(word) && word.length > 3
    );
    
    // Group similar words and limit to 5 most significant
    return [...new Set(addedWords)]
      .slice(0, 5)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1));
  }, [originalPrompt, displayedPrompt]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Оригинальный промпт
          </Label>
          <div className="p-4 rounded-lg border bg-muted/30 text-sm min-h-[150px] whitespace-pre-wrap">
            {originalPrompt || "Нет оригинального промпта"}
          </div>
        </div>
        
        {/* Enhanced (Editable) */}
        <div className="space-y-2">
          <Label className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            readonly ? "text-muted-foreground" : "text-primary"
          )}>
            {readonly ? "Улучшенный промпт" : "Улучшенный промпт (редактируемый)"}
          </Label>
          {readonly ? (
            <div className="p-4 rounded-lg border border-primary/40 bg-primary/5 text-sm min-h-[150px] whitespace-pre-wrap">
              {displayedPrompt}
            </div>
          ) : (
            <Textarea
              value={displayedPrompt}
              onChange={(e) => onEdit?.(e.target.value)}
              className="min-h-[150px] border-primary/40 focus:border-primary"
              placeholder="AI улучшит ваш промпт..."
            />
          )}
        </div>
      </div>

      {/* AI Additions Indicator */}
      {additions.length > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium">AI добавил:</p>
            <div className="flex flex-wrap gap-1.5">
              {additions.map(word => (
                <Badge key={word} variant="secondary" className="text-xs">
                  {word}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
