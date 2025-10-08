/**
 * Custom hook for music generation logic
 * Separates business logic from UI components
 * Optimized with memoization and debouncing
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService, GenerateMusicRequest } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo, logDebug, logWarn } from "@/utils/logger";
import { useDebounce } from "@/utils/performance";

interface GenerateMusicOptions {
  prompt?: string;
  title?: string;
  lyrics?: string;
  hasVocals?: boolean;
  styleTags?: string[];
  provider?: "replicate" | "suno";
  customMode?: boolean;
  modelVersion?: string;
}

export const useMusicGeneration = (onSuccess?: () => void) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [provider, setProvider] = useState<'replicate' | 'suno'>('suno');
  const [hasVocals, setHasVocals] = useState(false);
  const [lyrics, setLyrics] = useState("");
  const [styleTags, setStyleTags] = useState<string[]>([]);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Memoized validation functions
  const isValidPrompt = useMemo(() => {
    const safePrompt = typeof prompt === "string" ? prompt : "";
    return safePrompt.trim().length > 0;
  }, [prompt]);

  const canGenerate = useMemo(() => {
    return isValidPrompt && !isGenerating && !isImproving;
  }, [isValidPrompt, isGenerating, isImproving]);

  // Debounced prompt validation
  const debouncedValidatePrompt = useDebounce((promptValue: string) => {
    const safePrompt = typeof promptValue === "string" ? promptValue : "";
    if (safePrompt.trim().length > 0 && safePrompt.trim().length < 10) {
      logWarn("Короткий промпт может дать неточные результаты", "useMusicGeneration");
    }
  }, 500);

  // Optimized prompt setter with validation
  const setPromptOptimized = useCallback((value: string | null | undefined) => {
    const nextValue = typeof value === "string" ? value : value == null ? "" : String(value);
    setPrompt(nextValue);
    debouncedValidatePrompt(nextValue);
  }, [debouncedValidatePrompt]);

  // Memoized improve prompt function
  const improvePrompt = useCallback(async (overridePrompt?: string) => {
    const promptToImprove = typeof (overridePrompt ?? prompt) === "string"
      ? (overridePrompt ?? prompt)
      : "";

    if (!promptToImprove.trim()) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите описание музыки для улучшения.",
        variant: "destructive",
      });
      return null;
    }

    if (isImproving) return null;

    setIsImproving(true);
    logInfo("Начало улучшения промпта", "useMusicGeneration", {
      originalPrompt: promptToImprove.substring(0, 50)
    });

    try {
      const response = await ApiService.improvePrompt({ prompt: promptToImprove });
      setPrompt(response.improvedPrompt);

      logInfo("Промпт успешно улучшен", "useMusicGeneration", {
        originalLength: promptToImprove.length,
        improvedLength: response.improvedPrompt.length
      });

      toast({
        title: "✨ Промпт улучшен!",
        description: "Ваше описание было оптимизировано с помощью AI.",
      });

      return response.improvedPrompt;
    } catch (error) {
      logError("Ошибка при улучшении промпта", error as Error, "useMusicGeneration", {
        prompt: promptToImprove.substring(0, 100)
      });

      toast({
        title: "Ошибка",
        description: error instanceof Error ? error.message : "Не удалось улучшить промпт.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsImproving(false);
    }
  }, [prompt, isImproving, toast]);

  // Memoized generate music function
  const generateMusic = useCallback(async (options?: GenerateMusicOptions): Promise<boolean> => {
    const rawPrompt = options?.prompt ?? prompt;
    const effectivePrompt = typeof rawPrompt === "string" ? rawPrompt.trim() : "";
    const effectiveProvider = options?.provider ?? provider;
    const effectiveLyrics = options?.lyrics ?? lyrics;
    const effectiveHasVocals = options?.hasVocals ?? hasVocals;
    const effectiveStyleTags = options?.styleTags ?? styleTags;
    const effectiveTitle = options?.title ?? (effectivePrompt.substring(0, 50) || "Untitled Track");
    const effectiveCustomMode = options?.customMode ?? !!effectiveLyrics;
    const effectiveModelVersion = options?.modelVersion;

    const promptIsValid = effectivePrompt.length > 0;
    const canGenerateNow = promptIsValid && !isGenerating && !isImproving;

    if (!canGenerateNow) {
      if (!promptIsValid) {
        logWarn("Попытка генерации музыки с пустым промптом", "useMusicGeneration");
        toast({
          title: "Ошибка",
          description: "Пожалуйста, введите описание музыки",
          variant: "destructive",
        });
      }
      return false;
    }

    setIsGenerating(true);
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    const requestTimestamp = new Date().toISOString();
    logInfo("🎵 [useMusicGeneration] Начало генерации музыки", "useMusicGeneration", {
      timestamp: requestTimestamp,
      prompt: effectivePrompt.substring(0, 100),
      provider: effectiveProvider,
      hasVocals: effectiveHasVocals,
      lyricsLength: effectiveLyrics.length,
      styleTagsCount: effectiveStyleTags.length,
      generationParams: {
        title: effectiveTitle,
        prompt: effectivePrompt,
        provider: effectiveProvider,
        hasVocals: effectiveHasVocals,
        styleTags: effectiveStyleTags,
        customMode: effectiveCustomMode,
        modelVersion: effectiveModelVersion,
      }
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
        return false;
      }

      // Step 1: Create track record first
      const trackTitle = effectiveTitle;
      const trackPrompt = effectivePrompt;

      logDebug("📝 [useMusicGeneration] Creating track record", "useMusicGeneration", {
        title: trackTitle,
        provider: effectiveProvider,
        hasVocals: effectiveHasVocals,
        timestamp: new Date().toISOString()
      });

      const newTrack = await ApiService.createTrack(
        user.id,
        trackTitle,
        trackPrompt,
        effectiveProvider,
        effectiveHasVocals ? effectiveLyrics : undefined,
        effectiveHasVocals,
        effectiveStyleTags
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
        provider: effectiveProvider,
        timestamp: new Date().toISOString()
      });

      await ApiService.generateMusic({
        ...params,
        trackId: newTrack.id,
        userId: user.id,
        title: trackTitle,
        prompt: trackPrompt,
        provider: effectiveProvider,
        lyrics: effectiveLyrics || undefined,
        hasVocals: effectiveHasVocals,
        styleTags: effectiveStyleTags,
        customMode: effectiveCustomMode,
        modelVersion: effectiveModelVersion,
      });

      logInfo("✅ [useMusicGeneration] Генерация музыки успешно запущена", "useMusicGeneration", {
        userId: user.id,
        trackId: newTrack.id,
        provider: effectiveProvider,
        title: trackTitle,
        hasCustomLyrics: !!effectiveLyrics,
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

      // Start polling for track status
      pollIntervalRef.current = setInterval(async () => {
        try {
          const track = await ApiService.getTrackById(newTrack.id);
          if (track) {
            if (track.status === 'completed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              toast({
                title: "✅ Трек готов!",
                description: `Ваш трек "${track.title}" успешно сгенерирован.`,
              });
              onSuccess?.();
            } else if (track.status === 'failed') {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              logError('🔴 [useMusicGeneration] Генерация трека не удалась', new Error(track.error_message || 'Unknown error'), 'useMusicGeneration', { trackId: newTrack.id });
              toast({
                title: "❌ Ошибка генерации",
                description: track.error_message || "Произошла ошибка при обработке вашего трека.",
                variant: "destructive",
              });
            }
          }
        } catch (pollError) {
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
          logError('🔴 [useMusicGeneration] Ошибка при опросе статуса трека', pollError as Error, 'useMusicGeneration', { trackId: newTrack.id });
        }
      }, 5000);

      return true;
    } catch (error) {
      logError("🔴 [useMusicGeneration] Ошибка при генерации музыки", error as Error, "useMusicGeneration", {
        prompt: effectivePrompt.substring(0, 100),
        provider: effectiveProvider,
        hasVocals: effectiveHasVocals,
        requestDuration: Date.now() - new Date(requestTimestamp).getTime(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        errorStack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      });

      toast({
        title: "Ошибка генерации",
        description: error instanceof Error ? error.message : "Не удалось сгенерировать музыку.",
        variant: "destructive",
      });

      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }

      return false;
    } finally {
      setIsGenerating(false);
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [prompt, provider, hasVocals, lyrics, styleTags, isGenerating, isImproving, toast, onSuccess]);

  // Memoized style tags handlers
  const addStyleTag = useCallback((tag: string) => {
    if (!styleTags.includes(tag) && styleTags.length < 5) {
      setStyleTags(prev => [...prev, tag]);
    }
  }, [styleTags]);

  const removeStyleTag = useCallback((tag: string) => {
    setStyleTags(prev => prev.filter(t => t !== tag));
  }, []);

  useEffect(() => () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }
  }, []);

  // Memoized return object to prevent unnecessary re-renders
  return useMemo(() => ({
    isGenerating,
    isImproving,
    generateMusic,
    improvePrompt,
  }), [isGenerating, isImproving, generateMusic, improvePrompt]);
};