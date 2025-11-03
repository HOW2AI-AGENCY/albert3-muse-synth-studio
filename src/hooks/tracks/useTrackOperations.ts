import { useCallback, useMemo } from "react";
import type { Track } from "@/services/api.service";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { logError, logInfo } from "@/utils/logger";

type RetryFailureReason = "unauthorized" | "error";

export interface RetryTrackGenerationParams {
  track: Track;
  onSuccess?: () => void | Promise<void>;
}

export interface RetryTrackGenerationResult {
  success: boolean;
  reason?: RetryFailureReason;
  error?: Error;
}

export interface TrackOperations {
  retryTrackGeneration: (
    params: RetryTrackGenerationParams
  ) => Promise<RetryTrackGenerationResult>;
}

const resolveProvider = (provider: Track["provider"]) =>
  provider === "suno" || provider === "mureka" ? provider : "suno";

export const useTrackOperations = (): TrackOperations => {
  const { user } = useAuth();
  const { toast } = useToast();

  const retryTrackGeneration = useCallback<TrackOperations["retryTrackGeneration"]>(
    async ({ track, onSuccess }) => {
      if (!user) {
        toast({
          title: "Ошибка",
          description: "Необходима авторизация",
          variant: "destructive",
        });

        logInfo("Track retry blocked: no user", "useTrackOperations", {
          trackId: track.id,
        });

        return { success: false, reason: "unauthorized" };
      }

      toast({
        title: "Повторная генерация",
        description: "Запускаем генерацию заново...",
      });

      const provider = resolveProvider(track.provider);

      try {
        const { GenerationService } = await import("@/services/generation");

        await GenerationService.generate({
          title: track.title,
          prompt: track.prompt,
          provider: provider as any,
          lyrics: track.lyrics || undefined,
          hasVocals: track.has_vocals ?? false,
          styleTags: track.style_tags || undefined,
        });

        if (onSuccess) {
          await onSuccess();
        }

        toast({
          title: "Успешно",
          description: "Генерация перезапущена",
        });

        logInfo("Track retry initiated", "useTrackOperations", {
          trackId: track.id,
          provider,
          userId: user.id,
        });

        return { success: true };
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));

        logError("Track retry failed", error, "useTrackOperations", {
          trackId: track.id,
          provider,
          userId: user.id,
        });

        toast({
          title: "Ошибка",
          description: error.message || "Не удалось перезапустить генерацию",
          variant: "destructive",
        });

        return { success: false, reason: "error", error };
      }
    },
    [toast, user]
  );

  return useMemo(
    () => ({
      retryTrackGeneration,
    }),
    [retryTrackGeneration]
  );
};
