import React, { useCallback } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import type { WorkspaceNavItem } from "@/config/workspace-navigation";

interface BottomTabBarProps {
  items: WorkspaceNavItem[];
  className?: string;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  items = [],
  className,
}) => {
  const location = useLocation();
  const { vibrate } = useHapticFeedback();

  const handleTabClick = useCallback(() => {
    vibrate("light");
  }, [vibrate]);

  if (!items.length) {
    return null;
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur",
        "pb-[env(safe-area-inset-bottom)]",
        "lg:hidden",
        className
      )}
      role="navigation"
      aria-label="Основная навигация"
    >
      <div className="flex items-center justify-around px-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(`${item.path}/`);

          return (
            <NavLink
              key={item.id}
              to={item.path}
              onClick={handleTabClick}
              onPointerEnter={() => item.preload?.()}
              onFocus={() => item.preload?.()}
              className={({ isActive: navActive }) =>
                cn(
                  "relative flex flex-1 flex-col items-center justify-center gap-1 rounded-md px-3 py-2.5 text-xs font-medium transition min-h-[48px]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                  "hover:bg-muted/50",
                  (isActive || navActive) ? "text-primary" : "text-muted-foreground"
                )
              }
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-primary/10 rounded-md"
                  layoutId="activeTab"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              
              <motion.div
                className="relative z-10 flex flex-col items-center gap-1"
                animate={isActive ? { y: -2 } : { y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </motion.div>
                <span className="text-[11px] leading-tight font-medium">{item.label}</span>
              </motion.div>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
