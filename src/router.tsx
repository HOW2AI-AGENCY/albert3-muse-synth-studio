import { createBrowserRouter } from "react-router-dom";
import { Suspense } from "react";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GeneratorErrorFallback } from "@/components/error/GeneratorErrorFallback";
import { TrackListErrorFallback } from "@/components/error/TrackListErrorFallback";
import { FullPageSpinner } from "@/components/ui/loading-states";
import { ProjectProvider } from "@/contexts/ProjectContext";

// Critical routes - direct imports (no lazy loading)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

// Lazy-loaded workspace routes
import {
  LazyDashboard,
  LazyGenerate,
  LazyLibrary,
  LazyFavorites,
  LazyAnalytics,
  LazySettings,
  LazyProjects,
  LazyMonitoringHub,
  LazyStudio,
  LazyDAW,
  LazyProfile,
  LazyMetrics,
  LazyAdmin,
  LazyMonitoring,
  LazyLyricsLibrary,
  LazyAudioLibrary,
  LazyPersonas,
  LazyPromptDJPage,
  LazyEdgeFunctionsDebug,
  LazySunoPrototype,
} from "./utils/lazyPages";


export const router = createBrowserRouter(
  [
    { 
      path: "/", 
      element: <Landing />
    },
    { 
      path: "/auth", 
      element: <Auth />
    },
    {
      path: "/debug/edge-functions",
      element: (
        <Suspense fallback={<FullPageSpinner />}>
          <LazyEdgeFunctionsDebug />
        </Suspense>
      )
    },
    {
      path: "/debug/suno-prototype",
      element: (
        <Suspense fallback={<FullPageSpinner />}>
          <LazySunoPrototype />
        </Suspense>
      )
    },
    {
      path: "/workspace",
      element: (
        <ProtectedRoute>
          <ProjectProvider>
            <WorkspaceLayout />
          </ProjectProvider>
        </ProtectedRoute>
      ),
      children: [
        {
          path: "dashboard",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyDashboard />
            </Suspense>
          )
        },
        {
          path: "generate",
          element: (
            <ErrorBoundary fallback={(error, reset) => <GeneratorErrorFallback error={error} reset={reset} />}>
              <Suspense fallback={<FullPageSpinner />}>
                <LazyGenerate />
              </Suspense>
            </ErrorBoundary>
          )
        },
        {
          path: "projects",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyProjects />
            </Suspense>
          )
        },
        {
          path: "studio",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyStudio />
            </Suspense>
          )
        },
        {
          path: "daw",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyDAW />
            </Suspense>
          )
        },
        {
          path: "monitoring-hub",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyMonitoringHub />
            </Suspense>
          )
        },
        {
          path: "library",
          element: (
            <ErrorBoundary fallback={(error, reset) => <TrackListErrorFallback error={error} reset={reset} />}>
              <Suspense fallback={<FullPageSpinner />}>
                <LazyLibrary />
              </Suspense>
            </ErrorBoundary>
          )
        },
        {
          path: "favorites",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyFavorites />
            </Suspense>
          )
        },
        {
          path: "analytics",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyAnalytics />
            </Suspense>
          )
        },
        {
          path: "metrics",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyMetrics />
            </Suspense>
          )
        },
        {
          path: "settings",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazySettings />
            </Suspense>
          )
        },
        {
          path: "profile",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyProfile />
            </Suspense>
          )
        },
        {
          path: "admin",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyAdmin />
            </Suspense>
          )
        },
        {
          path: "monitoring",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyMonitoring />
            </Suspense>
          )
        },
        {
          path: "lyrics-library",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyLyricsLibrary />
            </Suspense>
          )
        },
        {
          path: "audio-library",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyAudioLibrary />
            </Suspense>
          )
        },
        {
          path: "personas",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyPersonas />
            </Suspense>
          )
        },
        {
          path: "prompt-dj",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyPromptDJPage />
            </Suspense>
          )
        },
      ],
    },
    { 
      path: "*", 
      element: <NotFound />
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,  // ✅ Better navigation state
    },
  }
);

export default router;
