import { createBrowserRouter } from "react-router-dom";
import { Suspense } from "react";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GeneratorErrorFallback } from "@/components/error/GeneratorErrorFallback";
import { TrackListErrorFallback } from "@/components/error/TrackListErrorFallback";
import { FullPageSpinner } from "@/components/ui/loading-states";

// Critical routes - direct imports (no lazy loading)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

// Phase 1 Optimization: Lazy load workspace routes
import { 
  LazyDashboard,
  LazyGenerate,
  LazyLibrary,
  LazyFavorites,
  LazyAnalytics,
  LazySettings,
} from "./utils/lazyPages";

// New hub pages
import Projects from "./pages/workspace/Projects";
import MonitoringHub from "./pages/workspace/MonitoringHub";

// Still direct imports (will lazy load in Phase 2)
import Profile from "./pages/workspace/Profile";
import Metrics from "./pages/workspace/Metrics";
import Admin from "./pages/workspace/Admin";
import Monitoring from "./pages/workspace/Monitoring";
import LyricsLibrary from "./pages/workspace/LyricsLibrary";
import AudioLibrary from "./pages/workspace/AudioLibrary";
import Personas from "./pages/workspace/Personas";
import EdgeFunctionsDebug from "./pages/debug/EdgeFunctionsDebug";


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
      element: <EdgeFunctionsDebug />
    },
    {
      path: "/workspace",
      element: (
        <ProtectedRoute>
          <WorkspaceLayout />
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
          element: <Projects />
        },
        {
          path: "monitoring-hub",
          element: <MonitoringHub />
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
          element: <Metrics />
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
          element: <Profile />
        },
        {
          path: "admin",
          element: <Admin />
        },
        {
          path: "monitoring",
          element: <Monitoring />
        },
        {
          path: "lyrics-library",
          element: <LyricsLibrary />
        },
        {
          path: "audio-library",
          element: <AudioLibrary />
        },
        {
          path: "personas",
          element: <Personas />
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
