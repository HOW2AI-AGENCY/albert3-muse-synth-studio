/**
 * Custom hook for music generation logic
 * Separates business logic from UI components
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo, logDebug, logWarn } from "@/utils/logger";

export const useMusicGeneration = (onSuccess?: () => void) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [provider, setProvider] = useState<'replicate' | 'suno'>('suno');
  const [hasVocals, setHasVocals] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const { toast } = useToast();

  const improvePrompt = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите описание музыки",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(true);
    try {
      const response = await ApiService.improvePrompt({ prompt });
      setPrompt(response.improvedPrompt);
      
      toast({
        title: "✨ Промпт улучшен!",
        description: "Ваше описание было улучшено с помощью AI",
      });
    } catch (error) {
      console.error("Error improving prompt:", error);
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось улучшить промпт",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  const generateMusic = async () => {
    if (!prompt.trim()) {
      logWarn("Попытка генерации музыки с пустым промптом", "useMusicGeneration");
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите описание музыки",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    logInfo("Начало генерации музыки", "useMusicGeneration", { 
      prompt: prompt.substring(0, 100), 
      provider, 
      hasVocals 
    });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        logWarn("Попытка генерации музыки без авторизации", "useMusicGeneration");
        toast({
          title: "Требуется авторизация",
          description: "Войдите в систему для генерации музыки",
          variant: "destructive",
        });
        return;
      }

      // Start generation process (userId extracted from JWT by edge function)
      await ApiService.generateMusic({
        title: prompt.substring(0, 50) || "Untitled Track",
        prompt: prompt,
        provider,
        lyrics: lyrics || undefined,
        hasVocals,
        styleTags,
        customMode: !!lyrics,
      });

      logInfo("Генерация музыки успешно запущена", "useMusicGeneration", {
        userId: user.id,
        provider,
        title: prompt.substring(0, 50)
      });

      toast({
        title: "🎵 Генерация началась!",
        description: "Ваш трек создаётся. Это может занять около минуты...",
      });

      setPrompt("");
      onSuccess?.();
    } catch (error) {
      logError("Ошибка при генерации музыки", error as Error, "useMusicGeneration", {
        prompt: prompt.substring(0, 100),
        provider,
        hasVocals
      });
      
      toast({
        title: "Ошибка генерации",
        description: error instanceof Error ? error.message : "Не удалось сгенерировать музыку",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    prompt,
    setPrompt,
    isGenerating,
    isImproving,
    improvePrompt,
    generateMusic,
    provider,
    setProvider,
    hasVocals,
    setHasVocals,
    lyrics,
    setLyrics,
    styleTags,
    setStyleTags,
  };
};
