import React, { useCallback } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  Home, 
  Sparkles, 
  Music, 
  Heart, 
  Settings,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
  path: string;
  badge?: number;
}

const defaultTabs: TabItem[] = [
  {
    id: 'dashboard',
    label: 'Главная',
    icon: Home,
    path: '/workspace/dashboard',
  },
  {
    id: 'generate',
    label: 'Создать',
    icon: Sparkles,
    path: '/workspace/generate',
  },
  {
    id: 'library',
    label: 'Библиотека',
    icon: Music,
    path: '/workspace/library',
  },
  {
    id: 'favorites',
    label: 'Избранное',
    icon: Heart,
    path: '/workspace/favorites',
  },
  {
    id: 'settings',
    label: 'Настройки',
    icon: Settings,
    path: '/workspace/settings',
  },
];

interface BottomTabBarProps {
  tabs?: TabItem[];
  className?: string;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({ 
  tabs = defaultTabs,
  className 
}) => {
  const location = useLocation();
  const { vibrate } = useHapticFeedback();

  const handleTabClick = useCallback(() => {
    vibrate('light');
  }, [vibrate]);

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-30',
        'bg-card/95 backdrop-blur-2xl border-t border-border/30 shadow-2xl',
        'pb-[env(safe-area-inset-bottom)] pt-2',
        'lg:hidden',
        className
      )}
      role="navigation"
      aria-label="Основная навигация"
    >
      <div className="flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path || 
                          location.pathname.startsWith(tab.path + '/');
          const Icon = tab.icon;

          return (
            <NavLink
              key={tab.id}
              to={tab.path}
              onClick={handleTabClick}
              className={cn(
                'flex flex-col items-center justify-center p-2 rounded-xl relative',
                'min-h-[60px] min-w-[60px] flex-1',
                'transition-all duration-300 ease-out',
                'hover:bg-accent/10 active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-primary/20',
                isActive && 'bg-gradient-to-b from-primary/10 to-accent/10 scale-105'
              )}
              aria-label={tab.label}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Badge */}
              {tab.badge && tab.badge > 0 && (
                <div 
                  className="absolute -top-0.5 right-2 bg-destructive text-white text-xs rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 font-bold shadow-lg animate-pulse-glow"
                  aria-label={`${tab.badge} уведомлений`}
                >
                  {tab.badge > 99 ? '99+' : tab.badge}
                </div>
              )}

              <Icon 
                className={cn(
                  'w-6 h-6 mb-1 transition-all duration-300',
                  isActive 
                    ? 'text-primary scale-110 drop-shadow-glow' 
                    : 'text-muted-foreground'
                )} 
                strokeWidth={isActive ? 2.5 : 2}
              />
              
              <span 
                className={cn(
                  'text-[11px] leading-tight transition-all duration-300',
                  isActive 
                    ? 'text-primary font-bold' 
                    : 'text-muted-foreground font-medium'
                )}
              >
                {tab.label}
              </span>

              {/* Active Indicator */}
              {isActive && (
                <div 
                  className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-12 h-1 bg-gradient-primary rounded-b-full animate-scale-in shadow-glow-primary"
                  aria-hidden="true"
                />
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomTabBar;
