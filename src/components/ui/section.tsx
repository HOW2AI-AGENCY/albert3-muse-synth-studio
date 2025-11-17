import * as React from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "@/utils/iconImports";
import { cn } from "@/lib/utils";

export interface SectionProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  badge?: React.ReactNode;
  action?: React.ReactNode;
}

export const Section = React.memo<SectionProps>(({ 
  title, 
  children, 
  defaultOpen = false,
  className,
  headerClassName,
  contentClassName,
  badge,
  action,
}) => {
  return (
    <Collapsible defaultOpen={defaultOpen} className={cn("w-full", className)}>
      <CollapsibleTrigger 
        className={cn(
          "flex items-center justify-between w-full",
          "hover:bg-accent/5 rounded-md transition-colors group",
          "p-[var(--space-compact-md)] sm:p-[var(--space-comfortable-sm)]",
          "touch-target-min",
          headerClassName
        )}
      >
        <div className="flex items-center gap-[var(--space-2)] text-sm font-medium">
          <ChevronDown 
            className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" 
            aria-hidden="true"
          />
          <span>{title}</span>
          {badge}
        </div>
        {action}
      </CollapsibleTrigger>
      <CollapsibleContent 
        className={cn(
          "pt-[var(--space-2)]",
          contentClassName
        )}
      >
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
});

Section.displayName = "Section";
