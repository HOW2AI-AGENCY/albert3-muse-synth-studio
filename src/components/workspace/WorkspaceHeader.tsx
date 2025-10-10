import { Search, Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { Button } from "@/components/ui/button";
import { useProviderBalance } from "@/hooks/useProviderBalance";
import { Skeleton } from "@/components/ui/skeleton";

interface WorkspaceHeaderProps {
  className?: string;
}

const WorkspaceHeader = ({ className }: WorkspaceHeaderProps) => {
  const [userEmail, setUserEmail] = useState<string>("");
  const { balance, isLoading: balanceLoading } = useProviderBalance();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);

  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-4 sm:px-6 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <div className="relative hidden w-full max-w-sm sm:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Поиск по библиотеке..."
            className="h-9 w-full rounded-md border-none bg-muted/60 pl-8 focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Открыть поиск"
        >
          <Search className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/50 px-2 py-1 text-sm">
          <Coins className="h-4 w-4 text-primary" aria-hidden="true" />
          {balanceLoading ? (
            <Skeleton className="h-4 w-10" />
          ) : (
            <span className="font-medium">{balance?.balance ?? 0}</span>
          )}
        </div>

        <NotificationsDropdown />

        <div className="flex items-center gap-2">
          <div className="hidden min-w-0 flex-col items-end md:flex">
            <span className="truncate text-sm font-medium">
              {userEmail.split("@")[0] || "Пользователь"}
            </span>
            <span className="truncate text-xs text-muted-foreground" title={userEmail}>
              {userEmail}
            </span>
          </div>
          <UserProfileDropdown userEmail={userEmail} />
        </div>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
