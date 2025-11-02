import { X, Sparkles, Coins } from "@/utils/iconImports";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import type { WorkspaceNavItem } from "@/config/workspace-navigation";
import { useProviderBalance } from "@/hooks/useProviderBalance";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useEffect, useState, memo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface MinimalSidebarProps {
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose?: () => void;
  items: WorkspaceNavItem[];
}

const baseLinkClasses =
  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200";

const MinimalSidebar = memo(({
  isExpanded,
  onMouseEnter,
  onMouseLeave,
  onClose,
  items,
}: MinimalSidebarProps) => {
  const location = useLocation();
  const { balance, isLoading: balanceLoading } = useProviderBalance();
  const [userEmail, setUserEmail] = useState<string>("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) setUserEmail(user.email);
    });
  }, []);


  return (
    <motion.aside
      initial={false}
      animate={{ 
        width: isExpanded ? 'var(--sidebar-width-expanded, 13rem)' : 'var(--sidebar-width-collapsed, 3.5rem)',
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={cn(
        "fixed left-0 top-0 hidden h-full border-r border-border/40 backdrop-blur-xl transition-all duration-300",
        "lg:flex md:w-16 shadow-lg",
        "bg-gradient-to-b from-background/98 via-background/95 to-background/98"
      )}
      style={{
        zIndex: 'var(--z-sidebar)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label="Навигация по рабочему пространству"
    >
      <div className="flex w-full flex-col gap-6 px-3 py-6 relative">
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-2 top-2 h-8 w-8 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Закрыть меню"
          >
            <X className="h-4 w-4" />
          </Button>
        )}

        {/* Logo */}
        <motion.div 
          className="flex items-center justify-center"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative flex h-10 w-10 items-center justify-center rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            <div className="absolute inset-0 rounded-lg bg-primary/5 blur-sm" />
          </div>
        </motion.div>


        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1.5 relative" role="menubar">
          {items.map((item, index) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              location.pathname.startsWith(`${item.path}/`);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
              >
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  onPointerEnter={() => item.preload?.()}
                  onFocus={() => item.preload?.()}
                  title={isExpanded ? undefined : item.label}
                  className={({ isActive: navActive }) =>
                    cn(
                      baseLinkClasses,
                      "group relative overflow-hidden",
                      "text-muted-foreground hover:text-foreground",
                      !isExpanded && "justify-center px-2",
                      (isActive || navActive)
                        ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                        : "hover:bg-muted/80 border border-transparent"
                    )
                  }
                  role="menuitem"
                  aria-current={isActive ? "page" : undefined}
                >
                  {/* Hover gradient */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent opacity-0 group-hover:opacity-100"
                    initial={false}
                    transition={{ duration: 0.3 }}
                  />
                  
                  {/* Active indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="activeNavItem"
                      className="absolute left-0 top-0 h-full w-1 bg-primary rounded-r"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative z-10"
                  >
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </motion.div>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        transition={{ duration: 0.2 }}
                        className="truncate relative z-10"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </motion.div>
            );
          })}
        </nav>


        {/* Bottom section */}
        <div className="mt-auto space-y-3">
          {/* Notifications & Credits */}
          <motion.div 
            className={cn(
              "flex items-center gap-2",
              !isExpanded && "flex-col"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Notifications */}
            <div className={cn(
              "flex-shrink-0",
              !isExpanded && "w-full flex justify-center"
            )}>
              <NotificationsDropdown />
            </div>

            {/* Credits Display */}
            <motion.div 
              className={cn(
                "flex items-center gap-2 rounded-lg border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-2 text-sm flex-1 shadow-sm",
                !isExpanded && "justify-center w-full"
              )}
              title={isExpanded ? undefined : `Кредиты: ${balance?.balance ?? 0}`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Coins className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    {balanceLoading ? (
                      <Skeleton className="h-4 w-10" />
                    ) : (
                      <span className="font-semibold text-primary">{balance?.balance ?? 0}</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>


          {/* Profile Button */}
          <motion.div 
            className={cn(
              "flex items-center gap-2 rounded-lg border border-border/40 bg-muted/50 p-2",
              !isExpanded && "justify-center"
            )}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            whileHover={{ backgroundColor: 'hsl(var(--muted))' }}
          >
            <AnimatePresence>
              {isExpanded && (
                <motion.div 
                  className="hidden min-w-0 flex-col items-start lg:flex flex-1"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <span className="truncate text-sm font-medium w-full">
                    {userEmail.split("@")[0] || "Пользователь"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground w-full" title={userEmail}>
                    {userEmail}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
            <UserProfileDropdown userEmail={userEmail} />
          </motion.div>
        </div>
      </div>
    </motion.aside>
  );
});

MinimalSidebar.displayName = 'MinimalSidebar';

export default MinimalSidebar;
