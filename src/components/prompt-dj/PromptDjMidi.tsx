import { memo, useCallback, useState } from 'react';
import { PromptController } from './PromptController';
import type { PromptData } from './types';

interface PromptDjMidiProps {
  initialPrompts: Map<string, PromptData>;
  audioLevels: Map<string, number>;
  onPromptsChange: (prompts: Map<string, PromptData>) => void;
}

export const PromptDjMidi = memo(({
  initialPrompts,
  audioLevels,
  onPromptsChange,
}: PromptDjMidiProps) => {
  const [prompts, setPrompts] = useState(initialPrompts);

  const handleTextChange = useCallback((id: string, text: string) => {
    setPrompts(prev => {
      const updated = new Map(prev);
      const prompt = updated.get(id)!;
      updated.set(id, { ...prompt, text, isFiltered: false });
      onPromptsChange(updated);
      return updated;
    });
  }, [onPromptsChange]);

  const handleWeightChange = useCallback((id: string, weight: number) => {
    setPrompts(prev => {
      const updated = new Map(prev);
      const prompt = updated.get(id)!;
      updated.set(id, { ...prompt, weight });
      onPromptsChange(updated);
      return updated;
    });
  }, [onPromptsChange]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
      {Array.from(prompts.values()).map((prompt) => (
        <PromptController
          key={prompt.id}
          text={prompt.text}
          weight={prompt.weight}
          audioLevel={audioLevels.get(prompt.id) || 0}
          isFiltered={prompt.isFiltered}
          onTextChange={(text) => handleTextChange(prompt.id, text)}
          onWeightChange={(weight) => handleWeightChange(prompt.id, weight)}
        />
      ))}
    </div>
  );
});

PromptDjMidi.displayName = 'PromptDjMidi';
