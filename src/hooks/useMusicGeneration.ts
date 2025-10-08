import { useState, useCallback, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService, GenerateMusicRequest } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo } from "@/utils/logger";

export const useMusicGeneration = (onSuccess?: () => void) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const { toast } = useToast();

  const improvePrompt = useCallback(async (prompt: string) => {
    if (!prompt.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите описание музыки для улучшения.",
        variant: "destructive",
      });
      return null;
    }

    if (isImproving) return null;

    setIsImproving(true);
    logInfo("Начало улучшения промпта", "useMusicGeneration", { originalLength: prompt.length });

    try {
      const response = await ApiService.improvePrompt({ prompt });
      toast({
        title: "✨ Промпт улучшен!",
        description: "Ваше описание было оптимизировано с помощью AI.",
      });
      return response;
    } catch (error) {
      logError("Ошибка при улучшении промпта", error as Error, "useMusicGeneration");
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось улучшить промпт.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsImproving(false);
    }
  }, [isImproving, toast]);

  const generateMusic = useCallback(async (params: Omit<GenerateMusicRequest, 'userId' | 'trackId'>) => {
    if (isGenerating) return;

    setIsGenerating(true);
    logInfo("🎵 [useMusicGeneration] Начало генерации музыки", "useMusicGeneration", { prompt: params.prompt });

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Требуется авторизация для генерации музыки.");
      }

      const newTrack = await ApiService.createTrack(
        user.id,
        params.prompt.substring(0, 100) || "Без названия",
        params.prompt,
        'suno',
        params.lyrics,
        params.hasVocals,
        params.styleTags
      );

      await ApiService.generateMusic({
        ...params,
        trackId: newTrack.id,
        userId: user.id,
        title: params.prompt.substring(0, 100) || "Без названия",
        provider: 'suno'
      });

      toast({
        title: "🎵 Генерация началась!",
        description: "Ваш трек создаётся. Это может занять около минуты...",
      });
      
      onSuccess?.();

    } catch (error) {
      logError("🔴 [useMusicGeneration] Ошибка при генерации музыки", error as Error, "useMusicGeneration");
      toast({
        title: "Ошибка генерации",
        description: error instanceof Error ? error.message : "Не удалось сгенерировать музыку.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, toast, onSuccess]);

  return useMemo(() => ({
    isGenerating,
    isImproving,
    generateMusic,
    improvePrompt,
  }), [isGenerating, isImproving, generateMusic, improvePrompt]);
};