/**
 * Prompt Section Component
 * Handles prompt input with AI enhancement
 */

import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import { GeneratorSection } from './GeneratorSection';
import { cn } from '@/lib/utils';

interface PromptSectionProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  isEnhancing?: boolean;
  onBoost?: () => void;
  disabled?: boolean;
  className?: string;
}

export const PromptSection: React.FC<PromptSectionProps> = ({
  value,
  onChange,
  placeholder = 'Опишите музыку, которую хотите создать...',
  isEnhancing = false,
  onBoost,
  disabled = false,
  className,
}) => {
  return (
    <GeneratorSection
      title="Промпт"
      description="Опишите желаемую музыку"
      className={className}
      headerAction={
        onBoost && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onBoost}
            disabled={!value.trim() || isEnhancing || disabled}
            className="h-8"
          >
            {isEnhancing ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                <span className="text-xs">Улучшаю...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 mr-1" />
                <span className="text-xs">Улучшить</span>
              </>
            )}
          </Button>
        )
      }
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        disabled={disabled}
        className={cn(
          'resize-none transition-all',
          'focus-visible:ring-2 focus-visible:ring-primary/20'
        )}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{value.length} / 500</span>
        {value.length > 450 && (
          <span className="text-amber-500">Близко к лимиту</span>
        )}
      </div>
    </GeneratorSection>
  );
};
