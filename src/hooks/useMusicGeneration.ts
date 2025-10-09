import { useMusicGenerationStore } from '@/stores/useMusicGenerationStore';
import { useEffect } from 'react';

export const useMusicGeneration = () => {
  const {
    isGenerating,
    isImproving,
    generateMusic,
    improvePrompt,
    cleanupSubscription,
  } = useMusicGenerationStore();

  useEffect(() => {
    return () => {
      cleanupSubscription();
    };
  }, [cleanupSubscription]);

  return { isGenerating, isImproving, generateMusic, improvePrompt };
};
