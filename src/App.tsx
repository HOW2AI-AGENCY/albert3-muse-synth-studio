import { useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { GlobalErrorBoundary } from "@/components/errors/GlobalErrorBoundary";
import { FullPageSpinner } from "@/components/ui/loading-states";
import router from "./router";
import { AppLayout } from "@/components/layout/AppLayout";
import { TelegramAuthProvider } from "@/contexts/TelegramAuthProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { reportWebVitals, logMetric } from "@/utils/web-vitals";
import { 
  preconnectExternalResources, 
  setupResourceHints 
} from "@/utils/bundleOptimization";
import { trackPerformanceMetric } from "@/utils/sentry-enhanced";

// ✅ Lazy load heavy components
const LazyGlobalAudioPlayer = lazy(() => import("./components/player/GlobalAudioPlayer"));
const LazyPerformanceMonitorWidget = lazy(() => 
  import("@/components/dev/PerformanceMonitorWidget").then(m => ({ default: m.PerformanceMonitorWidget }))
);
const LazySentryFeedbackButton = lazy(() => 
  import("@/components/SentryFeedbackButton").then(m => ({ default: m.SentryFeedbackButton }))
);

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
  // Monitor Web Vitals and track to Sentry
  useEffect(() => {
    const startTime = performance.now();
    
    reportWebVitals((metric) => {
      logMetric(metric);
      
      // Track to Sentry in production
      if (import.meta.env.PROD) {
        trackPerformanceMetric(
          metric.name === 'LCP' ? 'bundle_load' : 
          metric.name === 'FCP' ? 'bundle_load' : 'component_render',
          metric.value,
          { metric: metric.name }
        );
      }
    });

    // Track initial bundle load time
    window.addEventListener('load', () => {
      const loadTime = performance.now() - startTime;
      trackPerformanceMetric('bundle_load', loadTime, { type: 'initial' });
    });
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
        toast({
          title: "Внешний GET 401 к get-balance",
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
        <TelegramAuthProvider>
          <AuthProvider>
            <TooltipProvider delayDuration={200}>
              <AppLayout>
                <Suspense fallback={<FullPageSpinner />}>
                  <Toaster />
                  <RouterProvider router={router} />

                  {/* ✅ Lazy load heavy components */}
                  <Suspense fallback={null}>
                    <LazyGlobalAudioPlayer />
                  </Suspense>

                  {import.meta.env.DEV && (
                    <Suspense fallback={null}>
                      <LazyPerformanceMonitorWidget />
                    </Suspense>
                  )}

                  <Suspense fallback={null}>
                    <LazySentryFeedbackButton />
                  </Suspense>
                </Suspense>
              </AppLayout>
            </TooltipProvider>
          </AuthProvider>
        </TelegramAuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
