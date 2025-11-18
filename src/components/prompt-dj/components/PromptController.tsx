import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { WeightedPrompt } from '@/utils/PromptDJHelper';

interface PromptControllerProps {
  prompt: WeightedPrompt;
  index: number;
  audioLevel: number;
  onWeightChange: (weight: number) => void;
  onTextChange: (text: string) => void;
}

export const PromptController: React.FC<PromptControllerProps> = ({
  prompt,
  index,
  audioLevel,
  onWeightChange,
  onTextChange,
}) => {
  const isActive = prompt.weight > 0;
  const glowIntensity = isActive ? audioLevel * prompt.weight : 0;

  return (
    <Card
      className={cn(
        'transition-all duration-300 relative overflow-hidden flex flex-col',
        isActive && 'border-primary/50 shadow-lg',
        prompt.isFiltered && 'border-red-500 opacity-50'
      )}
      style={{
        boxShadow: isActive
          ? `0 0 ${20 + glowIntensity * 30}px rgba(var(--primary-rgb), ${glowIntensity * 0.5})`
          : undefined,
      }}
    >
      {prompt.isFiltered && (
        <div className="absolute top-2 right-2 z-10">
          <AlertCircle className="h-4 w-4 text-red-500" />
        </div>
      )}

      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground text-center">
          PROMPT {index + 1}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col items-center justify-between gap-4">
        <div className="h-48 flex items-center justify-center">
          <Slider
            value={[prompt.weight]}
            onValueChange={(value) => onWeightChange(value[0])}
            max={1}
            step={0.01}
            orientation="vertical"
            className="h-full accent-primary"
            disabled={prompt.isFiltered}
          />
        </div>
        <span className="font-medium text-sm">{prompt.weight.toFixed(2)}</span>
        <Input
          value={prompt.text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Enter prompt..."
          className="text-xs text-center h-8"
          disabled={prompt.isFiltered}
        />
      </CardContent>
    </Card>
  );
};
