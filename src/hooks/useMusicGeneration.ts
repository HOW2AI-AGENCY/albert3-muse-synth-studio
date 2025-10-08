/**
 * Custom hook for music generation logic
 * Separates business logic from UI components
 * Optimized with memoization and debouncing
 */

import { useState, useCallback, useMemo, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo, logDebug, logWarn } from "@/utils/logger";

// Debounce utility
const useDebounce = (callback: Function, delay: number) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

export const useMusicGeneration = (onSuccess?: () => void) => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [provider, setProvider] = useState<'replicate' | 'suno'>('suno');
  const [hasVocals, setHasVocals] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const { toast } = useToast();

  // Memoized validation functions
  const isValidPrompt = useMemo(() => {
    return prompt.trim().length > 0;
  }, [prompt]);

  const canGenerate = useMemo(() => {
    return isValidPrompt && !isGenerating && !isImproving;
  }, [isValidPrompt, isGenerating, isImproving]);

  // Memoized generation parameters
  const generationParams = useMemo(() => ({
    title: prompt.substring(0, 50) || "Untitled Track",
    prompt: prompt,
    provider,
    lyrics: lyrics || undefined,
    hasVocals,
    styleTags,
    customMode: !!lyrics,
  }), [prompt, provider, lyrics, hasVocals, styleTags]);

  // Debounced prompt validation
  const debouncedValidatePrompt = useDebounce((promptValue: string) => {
    if (promptValue.trim().length > 0 && promptValue.trim().length < 10) {
      logWarn("Короткий промпт может дать неточные результаты", "useMusicGeneration");
    }
  }, 500);

  // Optimized prompt setter with validation
  const setPromptOptimized = useCallback((value: string) => {
    setPrompt(value);
    debouncedValidatePrompt(value);
  }, [debouncedValidatePrompt]);

  // Memoized improve prompt function
  const improvePrompt = useCallback(async () => {
    if (!isValidPrompt) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите описание музыки",
        variant: "destructive",
      });
      return;
    }

    if (isImproving) return; // Prevent double calls

    setIsImproving(true);
    logInfo("Начало улучшения промпта", "useMusicGeneration", { 
      originalPrompt: prompt.substring(0, 50) 
    });

    try {
      const response = await ApiService.improvePrompt({ prompt });
      setPrompt(response.improvedPrompt);
      
      logInfo("Промпт успешно улучшен", "useMusicGeneration", {
        originalLength: prompt.length,
        improvedLength: response.improvedPrompt.length
      });
      
      toast({
        title: "✨ Промпт улучшен!",
        description: "Ваше описание было улучшено с помощью AI",
      });
    } catch (error) {
      logError("Ошибка при улучшении промпта", error as Error, "useMusicGeneration", {
        prompt: prompt.substring(0, 100)
      });
      
      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось улучшить промпт",
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  }, [prompt, isValidPrompt, isImproving, toast]);

  // Memoized generate music function
  const generateMusic = useCallback(async () => {
    if (!canGenerate) {
      if (!isValidPrompt) {
        logWarn("Попытка генерации музыки с пустым промптом", "useMusicGeneration");
        toast({
          title: "Ошибка",
          description: "Пожалуйста, введите описание музыки",
          variant: "destructive",
        });
      }
      return;
    }

    setIsGenerating(true);
    const requestTimestamp = new Date().toISOString();
    logInfo("🎵 [useMusicGeneration] Начало генерации музыки", "useMusicGeneration", { 
      timestamp: requestTimestamp,
      prompt: prompt.substring(0, 100), 
      provider, 
      hasVocals,
      lyricsLength: lyrics.length,
      styleTagsCount: styleTags.length,
      generationParams
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

      // Step 1: Create track record first
      const trackTitle = generationParams.title;
      const trackPrompt = generationParams.prompt;
      
      logDebug("📝 [useMusicGeneration] Creating track record", "useMusicGeneration", {
        title: trackTitle,
        provider,
        hasVocals,
        timestamp: new Date().toISOString()
      });

      const newTrack = await ApiService.createTrack(
        user.id,
        trackTitle,
        trackPrompt,
        provider,
        hasVocals ? lyrics : undefined,
        hasVocals,
        styleTags
      );

      logInfo("✅ [useMusicGeneration] Track record created successfully", "useMusicGeneration", {
        trackId: newTrack.id,
        title: trackTitle,
        status: newTrack.status,
        timestamp: new Date().toISOString()
      });

      // Step 2: Trigger generation with trackId
      logInfo("🚀 [useMusicGeneration] Triggering music generation", "useMusicGeneration", {
        trackId: newTrack.id,
        provider,
        timestamp: new Date().toISOString()
      });

      await ApiService.generateMusic({
        ...generationParams,
        trackId: newTrack.id,
        userId: user.id
      });

      logInfo("✅ [useMusicGeneration] Генерация музыки успешно запущена", "useMusicGeneration", {
        userId: user.id,
        trackId: newTrack.id,
        provider,
        title: trackTitle,
        hasCustomLyrics: !!lyrics,
        requestDuration: Date.now() - new Date(requestTimestamp).getTime(),
        timestamp: new Date().toISOString()
      });

      toast({
        title: "🎵 Генерация началась!",
        description: "Ваш трек создаётся. Это может занять около минуты...",
      });

      // Clear form after successful submission
      setPrompt("");
      setLyrics("");
      setStyleTags([]);
      
      onSuccess?.();
    } catch (error) {
      logError("🔴 [useMusicGeneration] Ошибка при генерации музыки", error as Error, "useMusicGeneration", {
        prompt: prompt.substring(0, 100),
        provider,
        hasVocals,
        requestDuration: Date.now() - new Date(requestTimestamp).getTime(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });
      
      toast({
        title: "Ошибка генерации",
        description: error instanceof Error ? error.message : "Не удалось сгенерировать музыку",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  }, [canGenerate, isValidPrompt, generationParams, toast, onSuccess, prompt, provider, hasVocals, lyrics, styleTags]);

  // Memoized style tags handlers
  const addStyleTag = useCallback((tag: string) => {
    if (!styleTags.includes(tag) && styleTags.length < 5) {
      setStyleTags(prev => [...prev, tag]);
    }
  }, [styleTags]);

  const removeStyleTag = useCallback((tag: string) => {
    setStyleTags(prev => prev.filter(t => t !== tag));
  }, []);

  // Memoized return object to prevent unnecessary re-renders
  return useMemo(() => ({
    prompt,
    setPrompt: setPromptOptimized,
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
    addStyleTag,
    removeStyleTag,
    canGenerate,
    isValidPrompt,
  }), [
    prompt,
    setPromptOptimized,
    isGenerating,
    isImproving,
    improvePrompt,
    generateMusic,
    provider,
    hasVocals,
    lyrics,
    styleTags,
    addStyleTag,
    removeStyleTag,
    canGenerate,
    isValidPrompt,
  ]);
};
