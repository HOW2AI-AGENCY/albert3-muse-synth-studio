import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  className?: string;
}

const WorkspaceHeader = ({ className }: WorkspaceHeaderProps) => {
  return (
    <header className={cn(
      "h-16 border-b border-border/50 bg-card/95 backdrop-blur-xl flex items-center justify-between px-4 sm:px-6 lg:px-8",
      className
    )}>
      {/* Left Section */}
      <div className="flex items-center gap-4">

        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Поиск треков..."
            className="pl-10 w-64 lg:w-80 bg-background/50 border-border/50 focus:border-primary/50 transition-all duration-300"
            aria-label="Поиск треков"
            role="searchbox"
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
          aria-label="Открыть поиск"
        >
          <Search className="w-5 h-5" />
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="sm"
          className="relative w-10 h-10 p-0 hover:bg-accent/10"
          aria-label="Уведомления"
        >
          <Bell className="w-5 h-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 w-5 h-5 p-0 flex items-center justify-center text-xs"
            aria-label="3 новых уведомления"
          >
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">Пользователь</p>
            <p className="text-xs text-muted-foreground">user@example.com</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-10 h-10 p-0 rounded-full hover:bg-accent/10"
            aria-label="Меню пользователя"
            aria-haspopup="menu"
          >
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-medium text-primary">У</span>
            </div>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
