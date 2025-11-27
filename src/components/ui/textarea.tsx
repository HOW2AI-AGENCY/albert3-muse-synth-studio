import * as React from "react";

import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  // Расширяем стандартные свойства textarea
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        "flex w-full rounded-md border border-input bg-background px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        // ✅ FIX: Mobile touch target sizing (CRITICAL)
        "min-h-[var(--mobile-touch-min,44px)] md:min-h-[80px]",
        // ✅ FIX: Font size >= 16px to prevent iOS auto-zoom (HIGH)
        "text-base md:text-sm",
        // ✅ Mobile-specific input styling
        "mobile-input",
        className,
      )}
      ref={ref}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
