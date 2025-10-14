import { memo, useMemo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, FileText, FileText as TextIcon } from '@/utils/iconImports';
import { cn } from '@/lib/utils';

interface LyricsInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateLyrics?: () => void;
  isGenerating: boolean;
  placeholder?: string;
  label?: string;
  maxLines?: number;
  compact?: boolean;
}

export const LyricsInput = memo(({
  value,
  onChange,
  onGenerateLyrics,
  isGenerating,
  placeholder = "Введите текст песни или используйте AI генератор...",
  label = "Текст песни",
  maxLines = 3000,
  compact = false,
}: LyricsInputProps) => {
  const stats = useMemo(() => {
    const lines = value.split('\n').length;
    const chars = value.length;
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    return { lines, chars, words };
  }, [value]);

  const isOverLimit = stats.lines > maxLines;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="lyrics" className={cn(
          "flex items-center gap-1.5",
          compact ? "text-[11px]" : "text-xs font-medium"
        )}>
          <FileText className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5")} />
          {label}
        </Label>
        <div className="flex items-center gap-1.5">
          {onGenerateLyrics && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onGenerateLyrics}
              disabled={isGenerating}
              className={cn(
                "gap-1.5 transition-colors",
                compact ? "h-6 px-2 text-[10px]" : "h-7 px-2.5 text-xs"
              )}
            >
              <Wand2 className="h-3 w-3" />
              <span className="hidden sm:inline">AI Генератор</span>
              <span className="sm:hidden">AI</span>
            </Button>
          )}
        </div>
      </div>

      <Textarea
        id="lyrics"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "resize-none text-sm transition-all font-mono",
          compact ? "min-h-[100px]" : "min-h-[120px] md:min-h-[140px]",
          isOverLimit && "border-destructive focus-visible:ring-destructive"
        )}
        disabled={isGenerating}
        rows={compact ? 5 : 6}
        aria-label="Текст песни"
      />

      {/* Stats bar */}
      {value && (
        <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono">
              <TextIcon className="h-2.5 w-2.5 mr-1" />
              {stats.lines} строк
            </Badge>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">{stats.words} слов</span>
            <span className="hidden md:inline">•</span>
            <span className="hidden md:inline">{stats.chars} символов</span>
          </div>
          {isOverLimit && (
            <span className="text-destructive text-[11px] font-medium">
              Превышен лимит ({maxLines} строк)
            </span>
          )}
        </div>
      )}
    </div>
  );
});

LyricsInput.displayName = 'LyricsInput';
