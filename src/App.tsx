import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { useEffect, Suspense } from "react";
import { GlobalErrorBoundary } from "@/components/errors/GlobalErrorBoundary";
import { FullPageSpinner } from "@/components/ui/loading-states";
import router from "./router";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { GlobalAudioPlayer } from "./components/player/GlobalAudioPlayer";
import { toast } from "sonner";

// Оптимизированная конфигурация React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 минут - кэш считается свежим
      gcTime: 1000 * 60 * 10, // 10 минут - время хранения в памяти (ранее cacheTime)
      refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
      refetchOnMount: false, // Не перезапрашивать при монтировании
      refetchOnReconnect: true, // Перезапросить при восстановлении соединения
      retry: (failureCount, error: Error & { status?: number }) => {
        // Не повторяем запросы для 4xx ошибок
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2; // Максимум 2 попытки
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1, // Одна попытка для мутаций
    },
  },
});

const App = () => {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { url?: string; method?: string; status?: number } | undefined;
      if (detail && import.meta.env.DEV) {
        toast.warning("Внешний GET 401 к get-balance", {
          description: `Метод: ${detail.method ?? "GET"}. Проверьте расширения браузера или внешние запросы.`,
        });
      }
    };
    window.addEventListener("external-get-balance-401", handler as EventListener);
    return () => window.removeEventListener("external-get-balance-401", handler as EventListener);
  }, []);

  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Suspense fallback={<FullPageSpinner />}>
            <AudioPlayerProvider>
              <Toaster />
              <Sonner />
              <RouterProvider router={router} />
              <GlobalAudioPlayer />
            </AudioPlayerProvider>
          </Suspense>
        </TooltipProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
