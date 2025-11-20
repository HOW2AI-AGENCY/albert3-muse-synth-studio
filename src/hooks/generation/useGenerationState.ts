import { useState } from 'react';

export const useGenerationState = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  return {
    isGenerating,
    error,
    setIsGenerating,
    setError,
  };
};
