import { memo } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wand2 } from '@/utils/iconImports';

interface LyricsInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateLyrics?: () => void;
  isGenerating: boolean;
  placeholder?: string;
  label?: string;
}

export const LyricsInput = memo(({
  value,
  onChange,
  onGenerateLyrics,
  isGenerating,
  placeholder = "Введите текст песни или используйте AI генератор...",
  label = "Текст песни",
}: LyricsInputProps) => {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label htmlFor="lyrics" className="text-xs font-medium">
          {label}
        </Label>
        {onGenerateLyrics && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateLyrics}
            disabled={isGenerating}
            className="h-6 px-2 text-[10px] gap-1"
          >
            <Wand2 className="h-3 w-3" />
            AI Генератор
          </Button>
        )}
      </div>
      <Textarea
        id="lyrics"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-[80px] text-sm resize-none"
        disabled={isGenerating}
        rows={4}
        aria-label="Текст песни"
      />
    </div>
  );
});

LyricsInput.displayName = 'LyricsInput';
