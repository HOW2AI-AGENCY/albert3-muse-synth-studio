import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { useEffect, Suspense } from "react";
import { GlobalErrorBoundary } from "@/components/errors/GlobalErrorBoundary";
import { FullPageSpinner } from "@/components/ui/loading-states";
import router from "./router";
import { GlobalAudioPlayer } from "./components/player/GlobalAudioPlayer";
import { AppLayout } from "@/components/layout/AppLayout";
import { PerformanceMonitorWidget } from "@/components/dev/PerformanceMonitorWidget";
import { SentryFeedbackButton } from "@/components/SentryFeedbackButton";
import { toast } from "sonner";
import { reportWebVitals, logMetric } from "@/utils/web-vitals";
import { 
  preconnectExternalResources, 
  setupResourceHints 
} from "@/utils/bundleOptimization";

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
  // Monitor Web Vitals in development
  useEffect(() => {
    if (import.meta.env.DEV) {
      reportWebVitals(logMetric);
    }
  }, []);

  // ✅ Setup performance optimizations
  useEffect(() => {
    preconnectExternalResources();
    setupResourceHints();
  }, []);

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
          <AppLayout>
            <Suspense fallback={<FullPageSpinner />}>
              <Toaster />
              <Sonner />
              <RouterProvider router={router} />
              <GlobalAudioPlayer />
              <PerformanceMonitorWidget />
              <SentryFeedbackButton />
            </Suspense>
          </AppLayout>
        </TooltipProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
