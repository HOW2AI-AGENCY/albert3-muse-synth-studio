import { Suspense, lazy } from "react";
import { createBrowserRouter } from "react-router-dom";

import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import ProtectedRoute from "./components/ProtectedRoute";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";

// Lazy routes (code splitting)
const Dashboard = lazy(() => import("./pages/workspace/Dashboard"));
const Generate = lazy(() => import("./pages/workspace/Generate"));
const Library = lazy(() => import("./pages/workspace/Library"));
const UploadAudio = lazy(() => import("./pages/workspace/UploadAudio"));
const Favorites = lazy(() => import("./pages/workspace/Favorites"));
const Analytics = lazy(() => import("./pages/workspace/Analytics"));
const Settings = lazy(() => import("./pages/workspace/Settings"));

const Admin = lazy(() => import("./pages/workspace/Admin"));
const Profile = lazy(() => import("./pages/workspace/Profile"));
const Metrics = lazy(() => import("./pages/workspace/Metrics"));
const EdgeFunctionsDebug = lazy(() => import("./pages/debug/EdgeFunctionsDebug"));

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
          <EdgeFunctionsDebug />
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
              <Dashboard />
            </Suspense>
          ),
        },
        {
          path: "generate",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Generate />
            </Suspense>
          ),
        },
        {
          path: "library",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Library />
            </Suspense>
          ),
        },
        {
          path: "upload-audio",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <UploadAudio />
            </Suspense>
          ),
        },
        {
          path: "favorites",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Favorites />
            </Suspense>
          ),
        },
        {
          path: "analytics",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Analytics />
            </Suspense>
          ),
        },
        {
          path: "metrics",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Metrics />
            </Suspense>
          ),
        },
        {
          path: "settings",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Settings />
            </Suspense>
          ),
        },
        {
          path: "profile",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Profile />
            </Suspense>
          ),
        },
        {
          path: "admin",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Admin />
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
