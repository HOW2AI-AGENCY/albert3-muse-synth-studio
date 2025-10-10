import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface WorkspaceHeaderProps {
  className?: string;
}

const WorkspaceHeader = ({ className }: WorkspaceHeaderProps) => {
  return (
    <header
      className={cn(
        "flex h-14 items-center justify-between border-b border-border/60 bg-background/95 px-4 sm:px-6 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex flex-1 items-center gap-3">
        <div className="relative hidden w-full max-w-sm sm:block">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input
            placeholder="Поиск по библиотеке..."
            className="h-9 w-full rounded-md border-none bg-muted/60 pl-8 focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          aria-label="Открыть поиск"
        >
          <Search className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};

export default WorkspaceHeader;
