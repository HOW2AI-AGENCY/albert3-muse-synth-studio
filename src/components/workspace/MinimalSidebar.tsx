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
  onClose?: () => void;
}

const MinimalSidebar = ({ onClose }: MinimalSidebarProps) => {
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-16 sm:w-20 lg:w-16 bg-card/95 backdrop-blur-xl border-r border-border/50 flex flex-col items-center py-4 gap-2 h-full">
        {/* Mobile Close Button */}
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="lg:hidden absolute top-4 right-4 z-10 w-8 h-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        )}

        {/* Logo */}
        <div className="p-3 mb-4">
          <div className="w-8 h-8 sm:w-10 sm:h-10 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm border border-primary/20 hover:border-primary/40 transition-all duration-300 hover:scale-105">
            <span className="text-primary font-bold text-xl sm:text-2xl lg:text-xl gradient-text">M</span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 flex flex-col gap-2 w-full px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => handleNavigation(item.path, item.preload)}
                    onMouseEnter={() => item.preload?.()}
                    className={cn(
                      "w-12 h-12 sm:w-14 sm:h-14 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center transition-all duration-300 touch-target group relative overflow-hidden",
                      isActive
                        ? "bg-gradient-to-br from-primary/20 to-accent/20 text-primary border border-primary/30 shadow-lg glow-primary"
                        : "hover:bg-accent/10 text-muted-foreground hover:text-foreground hover:border-accent/30 border border-transparent hover:scale-105"
                    )}
                  >
                    <Icon className={cn(
                      "w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 transition-all duration-300",
                      isActive ? "scale-110" : "group-hover:scale-110"
                    )} />
                    
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl animate-pulse-glow" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="hidden lg:block">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* User Avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-10 h-10 sm:w-12 sm:h-12 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center hover:from-primary/20 hover:to-accent/20 transition-all duration-300 hover:scale-105 border border-primary/20 hover:border-primary/40 touch-target">
              <User className="w-5 h-5 sm:w-6 sm:h-6 lg:w-5 lg:h-5 text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" className="hidden lg:block">
            <p>Профиль</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default MinimalSidebar;
