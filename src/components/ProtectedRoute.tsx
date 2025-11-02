import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { setUserContext } from "@/utils/sentry";
import { isTelegramWebApp, getTelegramInitData } from "@/utils/telegram/twa";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const isTWA = isTelegramWebApp();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      
      // Set Sentry user context
      if (session?.user) {
        setUserContext({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        });
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      
      // Update Sentry context on auth change
      if (session?.user) {
        setUserContext({
          id: session.user.id,
          email: session.user.email,
          username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
        });
      } else {
        setUserContext(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-4">Загрузка...</p>
        </div>
      </div>
    );
  }

  // Allow TWA users with valid initData to bypass auth check temporarily
  // (session will be set by TelegramAuthProvider)
  const hasValidTelegramData = isTWA && getTelegramInitData();
  
  if (!session && !hasValidTelegramData) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
