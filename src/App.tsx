import { useEffect, Suspense, lazy, Profiler } from "react";
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
import { LanguageProvider } from "@/i18n";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { toast } from "@/hooks/use-toast";
import { reportWebVitals, logMetric } from "@/utils/web-vitals";
import {
  preconnectExternalResources,
  setupResourceHints
} from "@/utils/bundleOptimization";
import { trackPerformanceMetric } from "@/utils/sentry-enhanced";
import { setupChunkErrorHandler } from "@/utils/chunkRetry";
import { recordPerformanceMetric } from "@/utils/performanceMonitor";

// ✅ Lazy load heavy components
const LazyGlobalAudioPlayer = lazy(() => import("./components/player/GlobalAudioPlayer"));
const LazyPerformanceMonitorWidget = lazy(() =>
  import("@/components/dev/PerformanceMonitorWidget").then(m => ({ default: m.PerformanceMonitorWidget }))
);

// ✅ Mobile-aware React Query configuration
// Reduce cache times on mobile devices to preserve memory
const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Mobile: 2 min cache, Desktop: 5 min cache
      staleTime: isMobile ? 1000 * 60 * 2 : 1000 * 60 * 5,
      // Mobile: 5 min memory retention, Desktop: 10 min
      gcTime: isMobile ? 1000 * 60 * 5 : 1000 * 60 * 10,
      refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
      refetchOnMount: false, // Не перезапрашивать при монтировании
      refetchOnReconnect: true, // Перезапросить при восстановлении соединения
      retry: (failureCount, error: Error & { status?: number }) => {
        // Не повторяем запросы для 4xx ошибок
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        // Mobile: 1 retry, Desktop: 2 retries (slower mobile connections)
        return failureCount < (isMobile ? 1 : 2);
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1, // Одна попытка для мутаций
    },
  },
});

const App = () => {
  // ✅ Setup chunk error handler
  useEffect(() => {
    setupChunkErrorHandler();
  }, []);

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
        <LanguageProvider>
          <TelegramAuthProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <TooltipProvider delayDuration={200}>
                  <AppLayout>
                    <Profiler id="AppLayout" onRender={(id, phase, actualDuration) => {
                      // Записываем метрику рендера компонента через PerformanceMonitor и Sentry
                      recordPerformanceMetric('rendering', actualDuration, 'ReactProfiler', { id, phase });
                      if (actualDuration > 1000) {
                        // 1s+ рендер считаем потенциально проблемным
                        trackPerformanceMetric('component_render', actualDuration, { component: id, phase });
                      }
                    }}>
                    <Suspense fallback={<FullPageSpinner />}>
                      <Toaster />
                      <RouterProvider router={router} />

                      {/* ✅ Lazy load heavy components */}
                      <Suspense fallback={null}>
                        <LazyGlobalAudioPlayer />
                      </Suspense>

                      {/* ✅ FIX: Hide PerformanceMonitor on mobile devices to avoid UI clutter */}
                      {import.meta.env.DEV && !isMobile && (
                        <Suspense fallback={null}>
                          <LazyPerformanceMonitorWidget />
                        </Suspense>
                      )}
                    </Suspense>
                    </Profiler>
                  </AppLayout>
                </TooltipProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </TelegramAuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
};

export default App;
