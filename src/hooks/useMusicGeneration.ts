/**
 * Custom hook for music generation logic
 * Separates business logic from UI components
 */

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";

export const useMusicGeneration = (onSuccess?: () => void) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
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
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите описание музыки",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Требуется авторизация",
          description: "Войдите в систему для генерации музыки",
          variant: "destructive",
        });
        return;
      }

      // Create track record
      const track = await ApiService.createTrack(
        user.id,
        prompt.substring(0, 50) || "Untitled Track",
        prompt
      );

      // Start generation process
      await ApiService.generateMusic({
        trackId: track.id,
        prompt: prompt,
      });

      toast({
        title: "🎵 Генерация началась!",
        description: "Ваш трек создаётся. Это может занять около минуты...",
      });

      setPrompt("");
      onSuccess?.();
    } catch (error) {
      console.error("Error generating music:", error);
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
  };
};
