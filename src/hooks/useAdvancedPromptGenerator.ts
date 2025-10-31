import { useMutation, type UseMutationOptions } from "@tanstack/react-query";
import { generateAdvancedPrompt, type AdvancedPromptRequest, type AdvancedPromptResult } from "@/services/ai/advanced-prompt-generator";

/**
 * Hook for generating advanced music prompts using AI style recommendations
 * Integrates with Lovable AI via Edge Function
 */
export function useAdvancedPromptGenerator(
  options?: Omit<UseMutationOptions<AdvancedPromptResult, Error, AdvancedPromptRequest>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: generateAdvancedPrompt,
    ...options,
  });
}
