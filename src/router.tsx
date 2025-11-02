import { createBrowserRouter } from "react-router-dom";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { GeneratorErrorFallback } from "@/components/error/GeneratorErrorFallback";
import { TrackListErrorFallback } from "@/components/error/TrackListErrorFallback";

// ⚠️ TEMPORARY: Direct imports for debugging React instance issues
// Will re-enable lazy loading after fixing multiple React instances problem
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";

// Workspace routes - direct imports
import Dashboard from "./pages/workspace/Dashboard";
import Generate from "./pages/workspace/Generate";
import Library from "./pages/workspace/Library";
import Favorites from "./pages/workspace/Favorites";
import Settings from "./pages/workspace/Settings";
import Profile from "./pages/workspace/Profile";
import Analytics from "./pages/workspace/Analytics";
import Metrics from "./pages/workspace/Metrics";
import Admin from "./pages/workspace/Admin";
import Monitoring from "./pages/workspace/Monitoring";
import LyricsLibrary from "./pages/workspace/LyricsLibrary";
import AudioLibrary from "./pages/workspace/AudioLibrary";
import Personas from "./pages/workspace/Personas";
import Projects from "./pages/workspace/Projects";
import EdgeFunctionsDebug from "./pages/debug/EdgeFunctionsDebug";
import ProjectDetails from "./pages/workspace/projects/ProjectDetails";
import Cloud from "./pages/workspace/Cloud";


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
        {
          path: "projects",
          children: [
            { index: true, element: <Projects /> },
            { path: ":projectId", element: <ProjectDetails /> },
          ]
        },
        {
          path: "cloud",
          element: <Cloud />
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
