import { memo } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { WeightKnob } from './WeightKnob';
import { cn } from '@/lib/utils';

interface PromptControllerProps {
  text: string;
  weight: number;
  audioLevel: number;
  isFiltered: boolean;
  onTextChange: (text: string) => void;
  onWeightChange: (weight: number) => void;
}

export const PromptController = memo(({
  text,
  weight,
  audioLevel,
  isFiltered,
  onTextChange,
  onWeightChange,
}: PromptControllerProps) => {
  return (
    <div 
      className={cn(
        "flex flex-col gap-2 p-3 rounded-lg border-2 transition-colors",
        isFiltered ? "border-destructive bg-destructive/5" : "border-border bg-card"
      )}
    >
      <Input
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Введите промпт..."
        className="text-sm mobile-input"
        disabled={weight === 0}
        maxLength={100}
      />
      
      <div className="flex items-center justify-between gap-2">
        <WeightKnob
          value={weight}
          audioLevel={audioLevel}
          onChange={onWeightChange}
          isActive={weight > 0}
        />
        
        {isFiltered && (
          <Badge variant="destructive" className="text-xs">
            Отфильтровано
          </Badge>
        )}
      </div>
    </div>
  );
});

PromptController.displayName = 'PromptController';
