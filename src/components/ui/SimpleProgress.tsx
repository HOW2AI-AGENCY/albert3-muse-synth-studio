import * as React from "react";
import { cn } from "@/lib/utils";

interface SimpleProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

const SimpleProgress = React.forwardRef<HTMLDivElement, SimpleProgressProps>(
  ({ className, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, value || 0))}%` }}
      />
    </div>
  )
);

SimpleProgress.displayName = "SimpleProgress";

export { SimpleProgress };
