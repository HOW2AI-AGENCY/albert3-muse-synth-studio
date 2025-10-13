import type { LucideIcon } from "@/utils/iconImports";
import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ActionTileProps {
  title: string;
  description: string;
  icon: LucideIcon;
  actionLabel?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  footer?: ReactNode;
  className?: string;
}

export const ActionTile = ({
  title,
  description,
  icon: Icon,
  actionLabel,
  onClick,
  footer,
  className,
}: ActionTileProps) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      "flex h-full flex-col items-start gap-3 rounded-lg border border-border/60 bg-card p-4 text-left shadow-sm transition", 
      "hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
      className
    )}
  >
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="text-base font-semibold text-foreground">{title}</span>
    </div>
    <p className="text-sm text-muted-foreground">{description}</p>
    {actionLabel && (
      <span className="text-sm font-medium text-primary">{actionLabel}</span>
    )}
    {footer}
  </button>
);

ActionTile.displayName = "ActionTile";

export default ActionTile;
