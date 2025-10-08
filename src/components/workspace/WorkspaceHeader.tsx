import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { Button } from "@/components/ui/button";

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
    <header
      className={cn(
        "h-16 border-b border-border/30 bg-background/90 backdrop-blur-2xl flex items-center justify-between px-4 sm:px-6 lg:px-8 shadow-lg",
        className
      )}
    >
      {/* Left Section - Search */}
      <div className="flex items-center gap-4 flex-1 max-w-2xl">
        <div className="relative w-full hidden sm:block group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground/70 group-hover:text-primary/70 transition-colors duration-300" />
          <Input
            placeholder="Поиск треков, исполнителей..."
            className="pl-10 h-10 bg-background/50 border-border/50 focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all duration-300 rounded-xl hover:bg-background/70"
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

        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        {/* User Profile - Desktop Info + Dropdown */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden md:flex flex-col items-end min-w-0 max-w-[180px]">
            <p className="text-sm font-semibold text-foreground truncate w-full">
              {userEmail.split("@")[0] || "Пользователь"}
            </p>
            <p
              className="text-xs text-muted-foreground truncate w-full overflow-hidden text-ellipsis"
              title={userEmail}
            >
              {userEmail}
            </p>
          </div>
          
          <UserProfileDropdown userEmail={userEmail} />
        </div>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
