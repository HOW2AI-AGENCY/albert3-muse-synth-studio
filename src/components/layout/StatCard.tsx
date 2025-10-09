import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  helperText?: string;
  icon?: ReactNode;
  className?: string;
}

export const StatCard = ({
  label,
  value,
  helperText,
  icon,
  className,
}: StatCardProps) => (
  <div
    className={cn(
      "flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 sm:p-5 shadow-sm",
      className
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-medium text-muted-foreground">
        {label}
      </span>
      {icon && <span className="text-muted-foreground">{icon}</span>}
    </div>
    <div className="text-2xl font-semibold text-foreground sm:text-3xl">
      {value}
    </div>
    {helperText && (
      <p className="text-xs text-muted-foreground">{helperText}</p>
    )}
  </div>
);

StatCard.displayName = "StatCard";

export default StatCard;
