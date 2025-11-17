/**
 * Lyrics Section Component
 * Handles lyrics input and generation
 */

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, FileText } from 'lucide-react';
import { GeneratorSection } from './GeneratorSection';
import { cn } from '@/lib/utils';

interface LyricsSectionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onGenerate?: () => void;
  onOpen?: () => void;
  isGenerating?: boolean;
}

export const LyricsSection: React.FC<LyricsSectionProps> = ({
  value,
  onChange,
  placeholder = 'Введите текст песни...',
  disabled = false,
  className,
  onGenerate,
  onOpen,
  isGenerating = false,
}) => {
  const lineCount = value.split('\n').length;

  return (
    <GeneratorSection
      title="Текст песни"
      description="Добавьте лирику (опционально)"
      className={className}
      headerAction={
        <div className="flex gap-1">
          {onGenerate && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onGenerate}
              disabled={isGenerating || disabled}
              className="h-8"
            >
              <Sparkles className="h-3 w-3 mr-1" />
              <span className="text-xs">Создать</span>
            </Button>
          )}
          {onOpen && value && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onOpen}
              disabled={disabled}
              className="h-8"
            >
              <FileText className="h-3 w-3 mr-1" />
              <span className="text-xs">Редактор</span>
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={8}
          disabled={disabled}
          className={cn(
            'resize-none font-mono text-sm transition-all',
            'focus-visible:ring-2 focus-visible:ring-primary/20'
          )}
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{lineCount} строк • {value.length} символов</span>
          {value.length > 2000 && (
            <span className="text-amber-500">Текст слишком длинный</span>
          )}
        </div>
      </div>
    </GeneratorSection>
  );
};
