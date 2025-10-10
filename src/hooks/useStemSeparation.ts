import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ApiService } from "@/services/api.service";

interface UseStemSeparationOptions {
  trackId: string;
  versionId?: string;
  onSuccess?: () => void;
  onStemsReady?: () => void;
}

export const useStemSeparation = ({
  trackId,
  versionId,
  onSuccess,
  onStemsReady,
}: UseStemSeparationOptions) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const navigate = useNavigate();
  const timersRef = useRef<{
    pollInterval: ReturnType<typeof setInterval> | null;
    abortTimeout: ReturnType<typeof setTimeout> | null;
    syncStartTimeout: ReturnType<typeof setTimeout> | null;
    syncInterval: ReturnType<typeof setInterval> | null;
  }>({
    pollInterval: null,
    abortTimeout: null,
    syncStartTimeout: null,
    syncInterval: null,
  });
  const syncInFlightRef = useRef(false);

  const clearAllTimers = useCallback(() => {
    if (timersRef.current.pollInterval) {
      clearInterval(timersRef.current.pollInterval);
      timersRef.current.pollInterval = null;
    }
    if (timersRef.current.abortTimeout) {
      clearTimeout(timersRef.current.abortTimeout);
      timersRef.current.abortTimeout = null;
    }
    if (timersRef.current.syncInterval) {
      clearInterval(timersRef.current.syncInterval);
      timersRef.current.syncInterval = null;
    }
    if (timersRef.current.syncStartTimeout) {
      clearTimeout(timersRef.current.syncStartTimeout);
      timersRef.current.syncStartTimeout = null;
    }
    syncInFlightRef.current = false;
  }, []);

  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  const generateStems = useCallback(
    async (mode: "separate_vocal" | "split_stem") => {
      clearAllTimers();

      try {
        setIsGenerating(true);

        const requestBody: Record<string, unknown> = {
          trackId,
          separationMode: mode,
        };

        if (versionId) {
          requestBody.versionId = versionId;
        }

        const { data: response, error } = await supabase.functions.invoke<{
          success?: boolean;
          taskId?: string;
          error?: string;
        }>("separate-stems", {
          body: requestBody,
        });

        if (error) {
          if (error.message?.includes("401") || error.message?.includes("Unauthorized")) {
            toast.error("Ваша сессия истекла. Пожалуйста, войдите снова.");
            navigate("/auth");
            return;
          }
          throw new Error(error.message ?? "Не удалось запустить разделение стемов");
        }

        if (response?.error) {
          throw new Error(response.error);
        }

        const targetTaskId = response?.taskId;

        if (!response?.success || !targetTaskId) {
          throw new Error("Сервис не вернул идентификатор задачи разделения стемов");
        }

        toast.success(
          mode === "separate_vocal"
            ? "Запущено разделение на вокал и инструментал"
            : "Запущено инструментальное разделение трека"
        );

        toast.info("Обработка займёт 30-180 секунд. Стемы появятся автоматически.", {
          duration: 5000,
        });

        onSuccess?.();

        // Fallback polling for database updates
        timersRef.current.pollInterval = setInterval(async () => {
          const { data: stemsData, error: stemsError } = await supabase
            .from("track_stems")
            .select("*")
            .eq("track_id", trackId);

          if (stemsError) {
            console.error("Error polling stems:", stemsError);
            return;
          }

          const matchingStems = stemsData?.filter((stem) => stem.suno_task_id === targetTaskId);

          if (matchingStems && matchingStems.length > 0) {
            clearAllTimers();
            onStemsReady?.();
            toast.success("Стемы успешно созданы!");
            setIsGenerating(false);
          }
        }, 5000);

        // Sync job fallback
        const attemptSync = async () => {
          if (syncInFlightRef.current) {
            return;
          }
          syncInFlightRef.current = true;
          try {
            const {
              data: { session: syncSession },
            } = await supabase.auth.getSession();

            if (!syncSession?.access_token) {
              return;
            }

            await ApiService.syncStemJob({
              trackId,
              versionId,
              taskId: targetTaskId,
              separationMode: mode,
            });
          } catch (syncError) {
            console.error("Error synchronising stem job:", syncError);
          } finally {
            syncInFlightRef.current = false;
          }
        };

        timersRef.current.syncStartTimeout = setTimeout(() => {
          void attemptSync();
          timersRef.current.syncInterval = setInterval(() => {
            void attemptSync();
          }, 60000);
        }, 45000);

        timersRef.current.abortTimeout = setTimeout(() => {
          clearAllTimers();
          setIsGenerating(false);
          toast.error("Не удалось получить стемы вовремя. Попробуйте позже.");
        }, 300000);
      } catch (error) {
        clearAllTimers();
        const message = error instanceof Error ? error.message : "Ошибка при создании стемов";
        console.error("Error generating stems:", error);
        
        if (message.includes("429")) {
          toast.error("Превышен лимит запросов. Попробуйте позже.");
        } else if (message.includes("402")) {
          toast.error("Недостаточно кредитов для разделения стемов.");
        } else if (message.includes("400")) {
          toast.error("Ошибка в параметрах запроса. Проверьте трек.");
        } else {
          toast.error(message);
        }
        setIsGenerating(false);
      }
    },
    [trackId, versionId, navigate, onSuccess, onStemsReady, clearAllTimers]
  );

  return {
    isGenerating,
    generateStems,
  };
};
