import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy } from "react";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { GlobalAudioPlayer } from "./components/player/GlobalAudioPlayer";

// Импортируем оптимизированные ленивые компоненты
import { 
  LazyDashboard, 
  LazyGenerate, 
  LazyLibrary, 
  LazyFavorites, 
  LazyAnalytics, 
  LazySettings,
  preloadDashboard,
  preloadGenerate,
  preloadLibrary
} from './utils/lazyImports';

// Компонент загрузки
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 минут
      retry: (failureCount, error: Error & { status?: number }) => {
        // Не повторяем запросы для 4xx ошибок
        if (error?.status && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AudioPlayerProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Protected Workspace Routes */}
              <Route
                path="/workspace"
                element={
                  <ProtectedRoute>
                    <WorkspaceLayout />
                  </ProtectedRoute>
                }
              >
                <Route 
                  path="dashboard" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LazyDashboard />
                    </Suspense>
                  } 
                />
                <Route 
                  path="generate" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LazyGenerate />
                    </Suspense>
                  } 
                />
                <Route 
                  path="library" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LazyLibrary />
                    </Suspense>
                  } 
                />
                <Route 
                  path="favorites" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LazyFavorites />
                    </Suspense>
                  } 
                />
                <Route 
                  path="analytics" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LazyAnalytics />
                    </Suspense>
                  } 
                />
                <Route 
                  path="settings" 
                  element={
                    <Suspense fallback={<LoadingSpinner />}>
                      <LazySettings />
                    </Suspense>
                  } 
                />
              </Route>

              {/* Catch-all route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <GlobalAudioPlayer />
          </BrowserRouter>
        </AudioPlayerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
