import { LayoutGrid, List } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ViewSwitcherProps {
  view: 'grid' | 'list';
  onViewChange: (view: 'grid' | 'list') => void;
}

export const ViewSwitcher = ({ view, onViewChange }: ViewSwitcherProps) => {
  return (
    <div className="flex items-center gap-1 bg-card/50 rounded-lg p-1">
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "h-8 w-8 p-0",
          view === 'grid' && "bg-primary text-primary-foreground hover:bg-primary-glow"
        )}
        onClick={() => onViewChange('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className={cn(
          "h-8 w-8 p-0",
          view === 'list' && "bg-primary text-primary-foreground hover:bg-primary-glow"
        )}
        onClick={() => onViewChange('list')}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
};
