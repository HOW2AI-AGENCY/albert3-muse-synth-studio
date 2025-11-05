import { X, Sparkles, Coins } from "@/utils/iconImports";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { WorkspaceNavItem } from "@/config/workspace-navigation";
import { useProviderBalance } from "@/hooks/useProviderBalance";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useAuth } from "@/contexts/AuthContext";

interface MinimalSidebarProps {
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose?: () => void;
  items: WorkspaceNavItem[];
}

const baseLinkClasses =
  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition";

const MinimalSidebar = ({
  isExpanded,
  onMouseEnter,
  onMouseLeave,
  onClose,
  items,
}: MinimalSidebarProps) => {
  const location = useLocation();
  const { balance, isLoading: balanceLoading } = useProviderBalance();
  const { user } = useAuth();
  const userEmail = user?.email ?? "";

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 hidden h-full border-r border-border/60 bg-background/95 backdrop-blur transition-all duration-300",
        "lg:flex",
        isExpanded ? "lg:w-52 md:w-52" : "lg:w-14 md:w-14"
      )}
      style={{
        zIndex: 'var(--z-sidebar)',
        width: isExpanded 
          ? 'var(--sidebar-width-expanded, 13rem)' 
          : 'var(--sidebar-width-collapsed, 3.5rem)'
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label="Навигация по рабочему пространству"
    >
      <div className="flex w-full flex-col gap-6 px-3 py-6">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 h-11 w-11 sm:h-9 sm:w-9 rounded-md"
            aria-label="Закрыть меню"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        <div className="flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border/60 bg-card text-primary">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1" role="menubar">
          {items.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onClose}
                onPointerEnter={() => item.preload?.()}
                onFocus={() => item.preload?.()}
                title={isExpanded ? undefined : item.label}
                className={({ isActive: navActive }) =>
                  cn(
                    baseLinkClasses,
                    "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    !isExpanded && "justify-center px-2",
                    (isActive || navActive) &&
                      "bg-primary/10 text-foreground hover:bg-primary/15"
                  )
                }
                role="menuitem"
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="h-5 w-5" aria-hidden="true" />
                {isExpanded && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto space-y-2">
          {/* Notifications & Credits */}
          <div className={cn(
            "flex items-center gap-2",
            !isExpanded && "flex-col"
          )}>
            {/* Notifications */}
            <div className={cn(
              "flex-shrink-0",
              !isExpanded && "w-full flex justify-center"
            )}>
              <NotificationsDropdown />
            </div>

            {/* Credits Display */}
            <div 
              className={cn(
                "flex items-center gap-2 rounded-md border border-border/60 bg-muted/50 p-2 text-sm flex-1",
                !isExpanded && "justify-center w-full"
              )}
              title={isExpanded ? undefined : `Кредиты: ${balance?.balance ?? 0}`}
            >
              <Coins className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
              {isExpanded && (
                balanceLoading ? (
                  <Skeleton className="h-4 w-10" />
                ) : (
                  <span className="font-medium">{balance?.balance ?? 0}</span>
                )
              )}
            </div>
          </div>

          {/* Profile Button */}
          <div className={cn(
            "flex items-center gap-2",
            !isExpanded && "justify-center"
          )}>
            {isExpanded && (
              <div className="hidden min-w-0 flex-col items-start lg:flex flex-1">
                <span className="truncate text-sm font-medium w-full">
                  {userEmail.split("@")[0] || "Пользователь"}
                </span>
                <span className="truncate text-xs text-muted-foreground w-full" title={userEmail}>
                  {userEmail}
                </span>
              </div>
            )}
            <UserProfileDropdown userEmail={userEmail} />
          </div>
        </div>
      </div>
    </aside>
  );
};

export default MinimalSidebar;
