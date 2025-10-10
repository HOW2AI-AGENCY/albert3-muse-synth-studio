import { X, User, Sparkles } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkspaceNavItem } from "@/config/workspace-navigation";

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

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-full border-r border-border/60 bg-background/95 backdrop-blur lg:flex",
        isExpanded ? "w-56" : "w-16"
      )}
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
            className="absolute right-2 top-2 h-8 w-8 rounded-md"
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

        <div className="mt-auto">
          <button
            type="button"
            className={cn(
              baseLinkClasses,
              "w-full justify-center border border-border/60 bg-card text-muted-foreground hover:border-border"
            )}
            onClick={onClose}
            aria-label="Открыть профиль"
            title={isExpanded ? undefined : "Профиль"}
          >
            <User className="h-5 w-5" aria-hidden="true" />
            {isExpanded && <span>Профиль</span>}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default MinimalSidebar;
