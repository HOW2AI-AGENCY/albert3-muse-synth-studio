import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { NavLink } from "react-router-dom";
import { MoreHorizontal } from "@/utils/iconImports";
import type { WorkspaceNavItem } from "@/config/workspace-navigation";
import { cn } from "@/lib/utils";

interface MobileMoreMenuProps {
  items: WorkspaceNavItem[];
}

export const MobileMoreMenu = ({ items }: MobileMoreMenuProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="flex flex-col items-center justify-center gap-1 min-h-[44px] px-2 py-1 rounded-lg hover:bg-accent/50 transition-colors flex-1"
          aria-label="Ещё"
        >
          <MoreHorizontal className="h-4 w-4" />
          <span className="text-[10px] font-medium truncate max-w-full">Ещё</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[60vh]">
        <SheetHeader>
          <SheetTitle>Дополнительные разделы</SheetTitle>
        </SheetHeader>
        <div className="grid gap-2 py-4">
          {items.map((item) => (
            <NavLink
              key={item.id}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors min-h-[44px]",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="font-medium">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};
