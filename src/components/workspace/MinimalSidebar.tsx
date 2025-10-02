import { Home, Sparkles, Library, Heart, BarChart3, Settings, User } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { preloadDashboard, preloadGenerate, preloadLibrary } from '../../utils/lazyImports';

const MinimalSidebar = () => {
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

  return (
    <TooltipProvider delayDuration={200}>
      <div className="w-16 bg-card border-r border-border flex flex-col items-center py-4 gap-2">
        {/* Logo */}
        <div className="p-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-xl">M</span>
          </div>
        </div>

        {/* Menu Items */}
        <div className="flex-1 flex flex-col gap-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <Tooltip key={item.path}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => navigate(item.path)}
                    onMouseEnter={() => item.preload?.()}
                    className={cn(
                      "w-12 h-12 rounded-lg flex items-center justify-center transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <Icon className="w-6 h-6" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>

        {/* User Avatar */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
              <User className="w-5 h-5 text-primary" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Профиль</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default MinimalSidebar;
