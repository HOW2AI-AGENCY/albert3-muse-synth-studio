import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import WorkspaceLayout from "./components/workspace/WorkspaceLayout";
import Dashboard from "./pages/workspace/Dashboard";
import Generate from "./pages/workspace/Generate";
import Library from "./pages/workspace/Library";
import Analytics from "./pages/workspace/Analytics";
import Settings from "./pages/workspace/Settings";
import ProtectedRoute from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import { AudioPlayerProvider } from "./contexts/AudioPlayerContext";
import { GlobalAudioPlayer } from "./components/player/GlobalAudioPlayer";

const queryClient = new QueryClient();

const App = () => (
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
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="generate" element={<Generate />} />
              <Route path="library" element={<Library />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <GlobalAudioPlayer />
        </BrowserRouter>
      </AudioPlayerProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
