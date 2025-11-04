import { useCallback, useMemo, useRef, useEffect, type FC } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import type { WorkspaceNavItem } from "@/config/workspace-navigation";
import { MobileMoreMenu } from "./MobileMoreMenu";

interface BottomTabBarProps {
  items: WorkspaceNavItem[];
  className?: string;
}

export const BottomTabBar: FC<BottomTabBarProps> = ({
  items = [],
  className,
}) => {
  const location = useLocation();
  const { vibrate } = useHapticFeedback();
  const tabBarRef = useRef<HTMLElement>(null);

  const handleTabClick = useCallback(() => {
    vibrate("light");
  }, [vibrate]);

  const { primaryItems, secondaryItems } = useMemo(() => {
    // Flatten children for display
    const flattenedItems = items.flatMap(item => 
      item.children ? [item, ...item.children] : [item]
    );
    
    const mobilePrimary = flattenedItems.filter(item => item.isMobilePrimary);
    const primary = mobilePrimary.slice(0, 3);
    const overflow = mobilePrimary.slice(3);
    const nonPrimary = flattenedItems.filter(item => !item.isMobilePrimary);
    const secondary = [...overflow, ...nonPrimary];
    return { primaryItems: primary, secondaryItems: secondary };
  }, [items]);

  // Update CSS variable for tab bar height
  useEffect(() => {
    if (!tabBarRef.current) return;
    
    const updateHeight = () => {
      const height = tabBarRef.current?.offsetHeight || 0;
      document.documentElement.style.setProperty(
        '--bottom-tab-bar-height',
        `${height}px`
      );
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  if (!items.length) {
    return null;
  }

  return (
    <nav
      ref={tabBarRef}
      data-bottom-tab-bar="true"
      className={cn(
        "fixed bottom-0 left-0 right-0 border-t border-border/30 bg-card/80 backdrop-blur-xl", /* Adjusted for glassmorphism effect */
        "pb-[env(safe-area-inset-bottom)]",
        "lg:hidden",
        className
      )}
      style={{ zIndex: 'var(--z-bottom-tab-bar)' }} /* Use specific z-index token */
      role="navigation"
      aria-label="Основная навигация"
      onKeyDown={(e) => {
        const focusableItems = tabBarRef.current?.querySelectorAll('a[href]');
        if (!focusableItems?.length) return;
        
        const currentIndex = Array.from(focusableItems).indexOf(document.activeElement as HTMLAnchorElement);
        
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % focusableItems.length;
          (focusableItems[nextIndex] as HTMLElement).focus();
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          const prevIndex = currentIndex <= 0 ? focusableItems.length - 1 : currentIndex - 1;
          (focusableItems[prevIndex] as HTMLElement).focus();
        }
      }}
    >
      <div className="flex items-center justify-between px-1.5">
        {primaryItems.map((item) => {
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
                  "relative flex flex-1 flex-col items-center justify-center rounded-md font-medium transition touch-optimized touch-target-min",
                  "gap-[var(--mobile-spacing-xs)]",
                  "px-[var(--mobile-spacing-sm)] py-[var(--mobile-spacing-sm)]",
                  "text-[var(--mobile-font-xs)] md:text-[var(--mobile-font-sm)]",
                  "focus-ring",
                  "hover:bg-muted/50 active:scale-95",
                  (isActive || navActive) ? "text-primary" : "text-muted-foreground"
                )
              }
              aria-label={`${item.label}. ${isActive ? 'Текущая страница' : 'Перейти к ' + item.label}`}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Active indicator */}
              {isActive && (
                <motion.div
                  className="absolute inset-0 bg-primary/10 rounded-md" /* Subtle background for active tab */
                  layoutId="activeTab"
                  initial={false}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  style={{ willChange: 'transform' }}
                />
              )}
              
              <motion.div
                className="relative z-10 flex flex-col items-center gap-0.5"
                animate={isActive ? { y: -2 } : { y: 0 }} /* Slight lift for active tab */
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <motion.div
                  whileTap={{ scale: 0.85 }} /* Tap animation for icons */
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </motion.div>
                <span className="text-[11px] leading-tight font-medium truncate max-w-[80px]">{item.label}</span>
              </motion.div>
            </NavLink>
          );
        })}
        
        {secondaryItems.length > 0 && (
          <MobileMoreMenu items={secondaryItems} />
        )}
      </div>
    </nav>
  );
};

export default BottomTabBar;
