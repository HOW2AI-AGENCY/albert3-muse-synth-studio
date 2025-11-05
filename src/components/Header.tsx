import { Button } from "@/components/ui/button";
import { Music2, LogOut, User } from "@/utils/iconImports";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";
import ProviderBalance from "./layout/ProviderBalance";
import { LanguageSwitcher } from "@/i18n";

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
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/30 bg-background/90 backdrop-blur-2xl shadow-lg">
      <div className="container mx-auto px-4 sm:px-6 h-16 sm:h-20 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-primary rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity animate-pulse-glow" />
            <img 
              src={logo} 
              alt="MusicAI Pro Logo" 
              className="relative h-10 w-10 sm:h-12 sm:w-12 rounded-full ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300 group-hover:scale-110" 
            />
          </div>
          <div className="flex items-center gap-2">
            <Music2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary animate-pulse" />
            <h1 className="text-lg sm:text-xl md:text-2xl font-black text-gradient-primary tracking-tight">
              MusicAI Pro
            </h1>
          </div>
        </div>

        {/* User Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher
            variant="icon-only"
            size="sm"
            className="sm:hidden"
          />
          <LanguageSwitcher
            variant="default"
            size="sm"
            className="hidden sm:flex"
          />

          {user ? (
            <>
              <ProviderBalance />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
                  {user.email}
                </span>
              </div>
              <Button
                variant="glass"
                size="sm"
                onClick={handleSignOut}
                className="hover:scale-105 transition-all duration-300"
              >
                <LogOut className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Выйти</span>
              </Button>
            </>
          ) : (
            <Button
              variant="hero"
              size="sm"
              onClick={onAuthClick}
              className="hover:scale-105 transition-all duration-300 shadow-glow-primary"
            >
              <User className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Войти</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
