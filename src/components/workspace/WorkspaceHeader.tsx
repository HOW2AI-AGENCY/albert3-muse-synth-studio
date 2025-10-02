import { Search, Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  onMenuClick?: () => void;
  className?: string;
}

const WorkspaceHeader = ({ onMenuClick, className }: WorkspaceHeaderProps) => {
  return (
    <header className={cn(
      "h-16 border-b border-border/50 bg-card/95 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 lg:px-8",
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onMenuClick}
          className="lg:hidden w-10 h-10 p-0 hover:bg-accent/10"
        >
          <Menu className="w-5 h-5" />
        </Button>

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск треков..."
            className="pl-10 w-64 lg:w-80 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Search Button */}
        <Button
          variant="ghost"
          size="sm"
          className="sm:hidden w-10 h-10 p-0 hover:bg-accent/10"
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative w-10 h-10 p-0 hover:bg-accent/10 transition-all duration-300 hover:scale-105"
        >
          <Bell className="w-5 h-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs animate-pulse-glow"
          >
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">Пользователь</p>
            <p className="text-xs text-muted-foreground">Pro план</p>
          </div>
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center border border-primary/30 hover:border-primary/50 transition-all duration-300 hover:scale-105 cursor-pointer">
            <span className="text-primary font-semibold text-sm sm:text-base">У</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
