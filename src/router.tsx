import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";

// Lazy routes
import {
  LazyDashboard,
  LazyGenerate,
  LazyLibrary,
  LazyFavorites,
  LazyAnalytics,
  LazySettings,
} from "./utils/lazyImports";

const LazyAdmin = lazy(() => import("./pages/workspace/Admin"));
const LazyEdgeFunctionsDebug = lazy(() => import("./pages/debug/EdgeFunctionsDebug"));

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const router = createBrowserRouter(
  [
    { path: "/", element: <Landing /> },
    { path: "/auth", element: <Auth /> },
    {
      path: "/debug/edge-functions",
      element: (
        <Suspense fallback={<LoadingSpinner />}>
          <LazyEdgeFunctionsDebug />
        </Suspense>
      ),
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
            <Suspense fallback={<LoadingSpinner />}>
              <LazyDashboard />
            </Suspense>
          ),
        },
        {
          path: "generate",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <LazyGenerate />
            </Suspense>
          ),
        },
        {
          path: "library",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <LazyLibrary />
            </Suspense>
          ),
        },
        {
          path: "favorites",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <LazyFavorites />
            </Suspense>
          ),
        },
        {
          path: "analytics",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <LazyAnalytics />
            </Suspense>
          ),
        },
        {
          path: "settings",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <LazySettings />
            </Suspense>
          ),
        },
        {
          path: "admin",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <LazyAdmin />
            </Suspense>
          ),
        },
      ],
    },
    { path: "*", element: <NotFound /> },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

export default router;