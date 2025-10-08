/**
 * Custom hook for music generation logic
 * Separates business logic from UI components
 * Optimized with memoization and debouncing
 */

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { ApiService } from "@/services/api.service";
import { supabase } from "@/integrations/supabase/client";
import { logError, logInfo, logDebug, logWarn } from "@/utils/logger";

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

const DEFAULT_PROVIDER: "replicate" | "suno" = "suno";

export const useMusicGeneration = (onSuccess?: () => void) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const clearPollingTimer = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const improvePrompt = useCallback(async (rawPrompt?: string) => {
    const promptToImprove = typeof rawPrompt === "string" ? rawPrompt.trim() : "";

    if (!promptToImprove) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите описание музыки для улучшения.",
        variant: "destructive",
      });
      return null;
    }

    if (isImproving) {
      return null;
    }

    setIsImproving(true);
    logInfo("Начало улучшения промпта", "useMusicGeneration", {
      originalPrompt: promptToImprove.substring(0, 50)
    });

    try {
      const response = await ApiService.improvePrompt({ prompt: promptToImprove });

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
  }, [isImproving, toast]);

  const generateMusic = useCallback(async (options?: GenerateMusicOptions): Promise<boolean> => {
    const effectivePrompt = typeof options?.prompt === "string" ? options.prompt.trim() : "";

    if (!effectivePrompt) {
      logWarn("Попытка генерации музыки с пустым промптом", "useMusicGeneration");
      toast({
        title: "Ошибка",
        description: "Пожалуйста, введите описание музыки",
        variant: "destructive",
      });
      return false;
    }

    if (isGenerating || isImproving) {
      logWarn("Попытка запуска генерации во время активного процесса", "useMusicGeneration");
      toast({
        title: "Подождите",
        description: "Предыдущая генерация ещё выполняется",
        variant: "destructive",
      });
      return false;
    }

    if (pollIntervalRef.current) {
      clearPollingTimer();
    }

    setIsGenerating(true);

    const effectiveProvider = options?.provider ?? DEFAULT_PROVIDER;
    const effectiveLyrics = typeof options?.lyrics === "string" ? options.lyrics : "";
    const effectiveHasVocals = options?.hasVocals ?? false;
    const effectiveStyleTags = options?.styleTags ?? [];
    const effectiveTitle = options?.title ?? (effectivePrompt.substring(0, 50) || "Untitled Track");
    const effectiveCustomMode = options?.customMode ?? Boolean(effectiveLyrics.trim());
    const effectiveModelVersion = options?.modelVersion;
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

      logDebug("📝 [useMusicGeneration] Creating track record", "useMusicGeneration", {
        title: effectiveTitle,
        provider: effectiveProvider,
        hasVocals: effectiveHasVocals,
        timestamp: new Date().toISOString()
      });

      const newTrack = await ApiService.createTrack(
        user.id,
        effectiveTitle,
        effectivePrompt,
        effectiveProvider,
        effectiveHasVocals && effectiveLyrics ? effectiveLyrics : undefined,
        effectiveHasVocals,
        effectiveStyleTags
      );

      logInfo("✅ [useMusicGeneration] Track record created successfully", "useMusicGeneration", {
        trackId: newTrack.id,
        title: effectiveTitle,
        status: newTrack.status,
        timestamp: new Date().toISOString()
      });

      logInfo("🚀 [useMusicGeneration] Triggering music generation", "useMusicGeneration", {
        trackId: newTrack.id,
        provider: effectiveProvider,
        timestamp: new Date().toISOString()
      });

      await ApiService.generateMusic({
        trackId: newTrack.id,
        userId: user.id,
        title: effectiveTitle,
        prompt: effectivePrompt,
        provider: effectiveProvider,
        lyrics: effectiveHasVocals ? effectiveLyrics : undefined,
        hasVocals: effectiveHasVocals,
        styleTags: effectiveStyleTags,
        customMode: effectiveCustomMode,
        modelVersion: effectiveModelVersion,
      });

      logInfo("✅ [useMusicGeneration] Генерация музыки успешно запущена", "useMusicGeneration", {
        userId: user.id,
        trackId: newTrack.id,
        provider: effectiveProvider,
        title: effectiveTitle,
        hasCustomLyrics: Boolean(effectiveLyrics),
        requestDuration: Date.now() - new Date(requestTimestamp).getTime(),
        timestamp: new Date().toISOString()
      });

      toast({
        title: "🎵 Генерация началась!",
        description: "Ваш трек создаётся. Это может занять около минуты...",
      });

      onSuccess?.();

      pollIntervalRef.current = setInterval(async () => {
        try {
          const track = await ApiService.getTrackById(newTrack.id);
          if (track) {
            if (track.status === 'completed') {
              clearPollingTimer();
              toast({
                title: "✅ Трек готов!",
                description: `Ваш трек "${track.title}" успешно сгенерирован.`,
              });
              onSuccess?.();
            } else if (track.status === 'failed') {
              clearPollingTimer();
              logError('🔴 [useMusicGeneration] Генерация трека не удалась', new Error(track.error_message || 'Unknown error'), 'useMusicGeneration', { trackId: newTrack.id });
              toast({
                title: "❌ Ошибка генерации",
                description: track.error_message || "Произошла ошибка при обработке вашего трека.",
                variant: "destructive",
              });
            }
          }
        } catch (pollError) {
          clearPollingTimer();
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

      clearPollingTimer();
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [isGenerating, isImproving, toast, onSuccess, clearPollingTimer]);

  useEffect(() => () => {
    clearPollingTimer();
  }, [clearPollingTimer]);

  return useMemo(() => ({
    isGenerating,
    isImproving,
    generateMusic,
    improvePrompt,
  }), [isGenerating, isImproving, generateMusic, improvePrompt]);
};
