import { createBrowserRouter } from "react-router-dom";

import WorkspaceLayout from "./components/workspace/WorkspaceLayout";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GeneratorErrorFallback } from "@/components/error/GeneratorErrorFallback";
import { TrackListErrorFallback } from "@/components/error/TrackListErrorFallback";

import { ProjectProvider } from "@/contexts/ProjectContext";

// Critical routes - direct imports (no lazy loading)
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

// Direct imports for critical pages to prevent React duplication
import Dashboard from "./pages/workspace/Dashboard";
import Generate from "./pages/workspace/Generate";
import Library from "./pages/workspace/Library";
import Favorites from "./pages/workspace/Favorites";
import Analytics from "./pages/workspace/Analytics";
import Settings from "./pages/workspace/Settings";

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
          <ProjectProvider>
            <WorkspaceLayout />
          </ProjectProvider>
        </ProtectedRoute>
      ),
      children: [
        {
          path: "dashboard",
          element: <Dashboard />
        },
        {
          path: "generate",
          element: (
            <ErrorBoundary fallback={(error, reset) => <GeneratorErrorFallback error={error} reset={reset} />}>
              <Generate />
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
              <Library />
            </ErrorBoundary>
          )
        },
        {
          path: "favorites",
          element: <Favorites />
        },
        {
          path: "analytics",
          element: <Analytics />
        },
        {
          path: "metrics",
          element: <Metrics />
        },
        {
          path: "settings",
          element: <Settings />
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
