import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageSectionProps {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export const PageSection = ({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: PageSectionProps) => (
  <section className={cn("space-y-4", className)}>
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-foreground sm:text-lg">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-card p-4 sm:p-6 shadow-sm",
        contentClassName
      )}
    >
      {children}
    </div>
  </section>
);

PageSection.displayName = "PageSection";

export default PageSection;
