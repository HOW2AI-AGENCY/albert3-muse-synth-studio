import { createBrowserRouter } from "react-router-dom";
import { Suspense } from "react";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";
import { EnhancedErrorBoundary } from "@/components/errors/EnhancedErrorBoundary";
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
  LazyProfile,
  LazyMetrics,
  LazyAdmin,
  LazyMonitoring,
  LazyLyricsLibrary,
  LazyAudioLibrary,
  LazyPersonas,
  LazyPromptDJPage,
  LazyEdgeFunctionsDebug,
  LazySubscription,
  LazyImageCropperDemo,
  LazyStemStudio,
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
          path: "studio/:trackId",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyStemStudio />
            </Suspense>
          )
        },
        {
          path: "generate",
          element: (
            <EnhancedErrorBoundary>
              <Suspense fallback={<FullPageSpinner />}>
                <LazyGenerate />
              </Suspense>
            </EnhancedErrorBoundary>
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
            <EnhancedErrorBoundary>
              <Suspense fallback={<FullPageSpinner />}>
                <LazyLibrary />
              </Suspense>
            </EnhancedErrorBoundary>
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
        // Track detail route removed - using detail panel in library instead
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
          path: "subscription",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazySubscription />
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
        {
          path: "image-cropper-demo",
          element: (
            <Suspense fallback={<FullPageSpinner />}>
              <LazyImageCropperDemo />
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
      v7_fetcherPersist: true,
    },
  }
);

export default router;
