import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Music2, LogOut, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

interface HeaderProps {
  user?: {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  onAuthClick: () => void;
}

export const Header = ({ user, onAuthClick }: HeaderProps) => {
  const { toast } = useToast();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({
      title: "Signed out",
      description: "You have been successfully signed out",
    });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-10 w-10" />
          <div className="flex items-center gap-2">
            <Music2 className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-gradient-primary">
              AI Music Studio
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <Button variant="hero" size="sm" onClick={onAuthClick}>
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
