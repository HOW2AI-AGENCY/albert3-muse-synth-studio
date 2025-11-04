import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Music } from "lucide-react";
import { cn } from "@/lib/utils";

interface LyricsDiffViewProps {
  originalLyrics: string;
  formattedLyrics: string;
  editedLyrics?: string;
  onEdit?: (value: string) => void;
  readonly?: boolean;
  className?: string;
}

export const LyricsDiffView = ({
  originalLyrics,
  formattedLyrics,
  editedLyrics,
  onEdit,
  readonly = false,
  className
}: LyricsDiffViewProps) => {
  const displayedLyrics = editedLyrics ?? formattedLyrics;

  // Detect Suno meta-tags
  const metaTags = useMemo(() => {
    const tags: string[] = [];
    const matches = displayedLyrics.match(/\[([^\]]+)\]/g);
    
    if (matches) {
      matches.forEach(match => {
        const tag = match.slice(1, -1);
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }
    
    return tags;
  }, [displayedLyrics]);

  const hasMetaTags = metaTags.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Оригинальная лирика
          </Label>
          <div className="p-4 rounded-lg border bg-muted/30 text-sm min-h-[200px] whitespace-pre-wrap font-mono text-xs">
            {originalLyrics || "Нет оригинальной лирики"}
          </div>
        </div>
        
        {/* Formatted (Editable) */}
        <div className="space-y-2">
          <Label className={cn(
            "text-xs font-semibold uppercase tracking-wide",
            readonly ? "text-muted-foreground" : "text-primary"
          )}>
            {readonly ? "Форматированная лирика" : "Форматированная лирика (редактируемая)"}
          </Label>
          {readonly ? (
            <div className="p-4 rounded-lg border border-primary/40 bg-primary/5 text-sm min-h-[200px] whitespace-pre-wrap font-mono text-xs">
              {displayedLyrics}
            </div>
          ) : (
            <Textarea
              value={displayedLyrics}
              onChange={(e) => onEdit?.(e.target.value)}
              className="min-h-[200px] border-primary/40 focus:border-primary font-mono text-xs"
              placeholder="AI форматирует лирику с Suno meta-тегами..."
            />
          )}
        </div>
      </div>

      {/* Meta-tags Indicator */}
      {hasMetaTags && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Music className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <p className="text-xs font-medium">Suno meta-теги:</p>
            <div className="flex flex-wrap gap-1.5">
              {metaTags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs font-mono">
                  [{tag}]
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
