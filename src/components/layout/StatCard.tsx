import type { ReactNode } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: ReactNode;
  helperText?: string;
  icon?: ReactNode;
  className?: string;
  trend?: {
    value: number; // percentage change
    label: string; // e.g., "vs last week"
  };
  isLoading?: boolean;
}

export const StatCard = ({
  label,
  value,
  helperText,
  icon,
  className,
  trend,
  isLoading = false,
}: StatCardProps) => (
  <div
    className={cn(
      "flex flex-col gap-3 rounded-lg border border-border/60 bg-card p-4 sm:p-5 shadow-sm transition-shadow hover:shadow-md",
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
      {isLoading ? (
        <div className="h-8 w-20 animate-pulse rounded bg-muted" />
      ) : (
        value
      )}
    </div>
    {trend && !isLoading && (
      <div
        className={cn(
          "flex items-center gap-1 text-xs font-medium",
          trend.value > 0 ? "text-green-500" : trend.value < 0 ? "text-red-500" : "text-muted-foreground"
        )}
      >
        {trend.value !== 0 && (
          <>
            {trend.value > 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            <span>{Math.abs(trend.value)}%</span>
          </>
        )}
        <span className={cn(trend.value === 0 ? "text-muted-foreground" : "")}>
          {trend.label}
        </span>
      </div>
    )}
    {helperText && !trend && (
      <p className="text-xs text-muted-foreground">{helperText}</p>
    )}
  </div>
);

StatCard.displayName = "StatCard";

export default StatCard;
