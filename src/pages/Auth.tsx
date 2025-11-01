import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";
import { Music } from "@/utils/iconImports";

const Auth = () => {
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        window.location.assign("/workspace/dashboard");
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        window.location.assign("/workspace/dashboard");
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Music className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text">MusicAI Pro</h1>
          <p className="text-muted-foreground mt-2">
            Войдите или создайте аккаунт
          </p>
        </div>
        
        <AuthForm />
      </div>
    </div>
  );
};

export default Auth;
