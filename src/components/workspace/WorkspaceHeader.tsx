import { Search, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface WorkspaceHeaderProps {
  className?: string;
}

const WorkspaceHeader = ({ className }: WorkspaceHeaderProps) => {
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  return (
    <header className={cn(
      "h-16 border-b border-border/30 bg-background/90 backdrop-blur-2xl flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-lg",
      className
    )}>
      {/* Left Section - Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <div className="relative w-full hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <Input
            placeholder="Поиск треков, исполнителей..."
            className="pl-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl"
          />
        </div>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Search */}
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden w-10 h-10 p-0 hover:bg-accent/10 rounded-xl transition-all duration-300"
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 hover:bg-accent/10 rounded-xl transition-all duration-300 hover:scale-105"
          >
            <Bell className="w-5 h-5" />
          </Button>
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs shadow-glow-primary animate-pulse-glow"
          >
            3
          </Badge>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col items-end min-w-0 max-w-[180px]">
            <p className="text-sm font-semibold text-foreground truncate w-full">
              {userEmail.split('@')[0] || "Пользователь"}
            </p>
            <p 
              className="text-xs text-muted-foreground truncate w-full overflow-hidden text-ellipsis" 
              title={userEmail}
            >
              {userEmail}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 rounded-full hover:scale-105 transition-all duration-300"
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/20 flex items-center justify-center hover:border-primary/40 transition-all duration-300">
              <User className="h-5 w-5 text-primary" />
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
