import { Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import { createLazyComponent } from "./utils/lazyImports";

// ✅ FIX: Lazy load all pages for optimal bundle splitting
const Landing = createLazyComponent(() => import("./pages/Landing"), "Landing");
const Auth = createLazyComponent(() => import("./pages/Auth"), "Auth");
const NotFound = createLazyComponent(() => import("./pages/NotFound"), "NotFound");
const ProtectedRoute = createLazyComponent(() => import("./components/ProtectedRoute"), "ProtectedRoute");
const WorkspaceLayout = createLazyComponent(() => import("./components/workspace/WorkspaceLayout"), "WorkspaceLayout");

// ========== LAZY ROUTES (Code Splitting) with Error Handling ==========
// Critical path - minimal chunks
const Dashboard = createLazyComponent(() => import("./pages/workspace/Dashboard"), "Dashboard");
const Generate = createLazyComponent(() => import("./pages/workspace/Generate"), "Generate");
const Library = createLazyComponent(() => import("./pages/workspace/Library"), "Library");

// Secondary routes - separate chunks
const Favorites = createLazyComponent(() => import("./pages/workspace/Favorites"), "Favorites");
const Settings = createLazyComponent(() => import("./pages/workspace/Settings"), "Settings");
const Profile = createLazyComponent(() => import("./pages/workspace/Profile"), "Profile");

// Heavy routes - isolated chunks (recharts)
const Analytics = createLazyComponent(() => import("./pages/workspace/Analytics"), "Analytics");
const Metrics = createLazyComponent(() => import("./pages/workspace/Metrics"), "Metrics");

// Admin routes - separate chunk
const Admin = createLazyComponent(() => import("./pages/workspace/Admin"), "Admin");
const Monitoring = createLazyComponent(() => import("./pages/workspace/Monitoring"), "Monitoring");

// Library routes - Sprint 30 & Sprint 31
const LyricsLibrary = createLazyComponent(() => import("./pages/workspace/LyricsLibrary"), "LyricsLibrary");
const AudioLibrary = createLazyComponent(() => import("./pages/workspace/AudioLibrary"), "AudioLibrary");
const Personas = createLazyComponent(() => import("./pages/workspace/Personas"), "Personas");

// Debug route
const EdgeFunctionsDebug = createLazyComponent(() => import("./pages/debug/EdgeFunctionsDebug"), "EdgeFunctionsDebug");

const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

export const router = createBrowserRouter(
  [
    { 
      path: "/", 
      element: (
        <Suspense fallback={<LoadingSpinner />}>
          <Landing />
        </Suspense>
      )
    },
    { 
      path: "/auth", 
      element: (
        <Suspense fallback={<LoadingSpinner />}>
          <Auth />
        </Suspense>
      )
    },
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
        <Suspense fallback={<LoadingSpinner />}>
          <ProtectedRoute>
            <WorkspaceLayout />
          </ProtectedRoute>
        </Suspense>
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
        {
          path: "monitoring",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Monitoring />
            </Suspense>
          ),
        },
        {
          path: "lyrics-library",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <LyricsLibrary />
            </Suspense>
          ),
        },
        {
          path: "audio-library",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <AudioLibrary />
            </Suspense>
          ),
        },
        {
          path: "personas",
          element: (
            <Suspense fallback={<LoadingSpinner />}>
              <Personas />
            </Suspense>
          ),
        },
      ],
    },
    { 
      path: "*", 
      element: (
        <Suspense fallback={<LoadingSpinner />}>
          <NotFound />
        </Suspense>
      )
    },
  ],
  {
    future: {
      v7_relativeSplatPath: true,
      v7_fetcherPersist: true,  // ✅ Better navigation state
    },
  }
);

// ✅ Preload critical routes on app start (after 2s idle)
if (typeof window !== 'undefined') {
  setTimeout(() => {
    // Preload most visited routes
    import("./pages/workspace/Generate");
    import("./pages/workspace/Library");
  }, 2000);
}

export default router;
