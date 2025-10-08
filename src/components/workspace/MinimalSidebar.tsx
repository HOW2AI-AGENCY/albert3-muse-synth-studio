import { Home, Sparkles, Library, Heart, BarChart3, Settings, User, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { preloadDashboard, preloadGenerate, preloadLibrary } from '../../utils/lazyImports';

interface MinimalSidebarProps {
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClose?: () => void;
}

const MinimalSidebar = ({ isExpanded, onMouseEnter, onMouseLeave, onClose }: MinimalSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { 
      icon: Home, 
      label: "Главная", 
      path: "/workspace/dashboard",
      preload: preloadDashboard
    },
    { 
      icon: Sparkles, 
      label: "Генерация", 
      path: "/workspace/generate",
      preload: preloadGenerate
    },
    { 
      icon: Library, 
      label: "Библиотека", 
      path: "/workspace/library",
      preload: preloadLibrary
    },
    { icon: Heart, label: "Избранное", path: "/workspace/favorites" },
    { icon: BarChart3, label: "Аналитика", path: "/workspace/analytics" },
    { icon: Settings, label: "Настройки", path: "/workspace/settings" },
  ];

  const handleNavigation = (path: string, preload?: () => void) => {
    navigate(path);
    preload?.();
    onClose?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent, path: string, preload?: () => void) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleNavigation(path, preload);
    }
  };

  return (
    <TooltipProvider>
      <aside 
        className={cn(
          "fixed left-0 top-0 z-40 h-full bg-card/95 backdrop-blur-2xl border-r border-border/50",
          "flex flex-col items-center py-6 transition-all duration-300 ease-in-out",
          isExpanded ? "w-64" : "w-16",
          "hidden lg:flex"
        )}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        role="navigation"
        aria-label="Основная навигация"
      >
        {/* Close button for mobile */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="absolute top-4 right-4 lg:hidden w-8 h-8 p-0 hover:bg-accent/10 rounded-xl transition-all duration-300"
            aria-label="Закрыть меню"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Logo/Brand */}
        <div className="mb-8 p-2 relative group">
          <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity animate-pulse-glow" />
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/20 flex items-center justify-center hover:scale-110 transition-all duration-300">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 w-full px-2 space-y-1" role="menubar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            
            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleNavigation(item.path, item.preload)}
                    onKeyDown={(e) => handleKeyDown(e, item.path, item.preload)}
                    className={cn(
                      "w-full h-12 justify-start px-3 rounded-xl transition-all duration-300 relative group",
                      isActive 
                        ? "bg-gradient-to-r from-primary/20 to-accent/20 text-primary border border-primary/20 shadow-glow-primary" 
                        : "hover:bg-accent/10 hover:scale-105"
                    )}
                    role="menuitem"
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    tabIndex={0}
                  >
                    <Icon className={cn(
                      "w-5 h-5 shrink-0 transition-all duration-300",
                      isActive && "animate-pulse"
                    )} />
                    <span className={cn(
                      "ml-3 whitespace-nowrap transition-all duration-300 font-medium",
                      isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                    )}>
                      {item.label}
                    </span>
                    {isActive && (
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-primary rounded-l-full" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent 
                  side="right" 
                  className={cn(
                    "bg-card/95 backdrop-blur-xl border-border/50",
                    isExpanded && "hidden"
                  )}
                >
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="mt-auto p-2 w-full">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-12 justify-start px-3 rounded-xl hover:bg-accent/10 transition-all duration-300 hover:scale-105"
                role="menuitem"
                aria-label="Профиль пользователя"
                tabIndex={0}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <span className={cn(
                  "ml-3 whitespace-nowrap transition-all duration-300 font-medium",
                  isExpanded ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2"
                )}>
                  Профиль
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent 
              side="right" 
              className={cn(
                "bg-card/95 backdrop-blur-xl border-border/50",
                isExpanded && "hidden"
              )}
            >
              <p>Профиль</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
};

export default MinimalSidebar;
