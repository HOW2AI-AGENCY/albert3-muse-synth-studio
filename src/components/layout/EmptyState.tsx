import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border/60 bg-muted/30 p-8 text-center",
      className
    )}
  >
    {icon && <div className="text-muted-foreground">{icon}</div>}
    <div className="space-y-2">
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
    </div>
    {action && <div className="mt-2">{action}</div>}
  </div>
);

EmptyState.displayName = "EmptyState";

export default EmptyState;
