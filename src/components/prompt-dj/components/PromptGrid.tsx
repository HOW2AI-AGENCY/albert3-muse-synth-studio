import React from 'react';
import type { WeightedPrompt } from '@/utils/PromptDJHelper';
import { PromptController } from './PromptController';

interface PromptGridProps {
  prompts: WeightedPrompt[];
  audioLevel: number;
  onWeightChange: (promptId: string, weight: number) => void;
  onTextChange: (promptId: string, text: string) => void;
}

export const PromptGrid: React.FC<PromptGridProps> = ({
  prompts,
  audioLevel,
  onWeightChange,
  onTextChange,
}) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 xl:grid-cols-8 gap-4">
      {prompts.map((prompt, index) => (
        <PromptController
          key={prompt.id}
          prompt={prompt}
          index={index}
          audioLevel={audioLevel}
          onWeightChange={(weight) => onWeightChange(prompt.id, weight)}
          onTextChange={(text) => onTextChange(prompt.id, text)}
        />
      ))}
    </div>
  );
};
