import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";

// Lazy routes
const LazyDashboard = lazy(() => import("./pages/workspace/Dashboard"));
import Generate from "./pages/workspace/Generate";
const LazyLibrary = lazy(() => import("./pages/workspace/Library"));
const LazyFavorites = lazy(() => import("./pages/workspace/Favorites"));
const LazyAnalytics = lazy(() => import("./pages/workspace/Analytics"));
const LazySettings = lazy(() => import("./pages/workspace/Settings"));

const LazyAdmin = lazy(() => import("./pages/workspace/Admin"));
const LazyProfile = lazy(() => import("./pages/workspace/Profile"));
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
          element: <Generate />,
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
          path: "profile",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <LazyProfile />
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
      v7_relativeSplatPath: true,
    },
  }
);

export default router;
