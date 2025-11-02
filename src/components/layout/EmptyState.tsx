import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export const EmptyState = ({
  title,
  description,
  icon,
  className,
}: EmptyStateProps) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/30 p-8 text-center",
      className
    )}
  >
    {icon && <div className="text-muted-foreground">{icon}</div>}
    <h3 className="text-base font-semibold text-foreground">{title}</h3>
    {description && (
      <p className="text-sm text-muted-foreground">{description}</p>
    )}
  </div>
);

EmptyState.displayName = "EmptyState";

export default EmptyState;
