import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface CompactSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: string;
  showValue?: boolean;
}

const CompactSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  CompactSliderProps
>(({ className, label, showValue = true, ...props }, ref) => {
  const value = props.value?.[0] ?? props.defaultValue?.[0] ?? 0;

  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            {label}
          </label>
          {showValue && (
            <span className="text-xs font-semibold text-foreground tabular-nums">
              {value}
            </span>
          )}
        </div>
      )}
      <SliderPrimitive.Root
        ref={ref}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          className
        )}
        {...props}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-secondary/50">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb
          className="block h-4 w-4 rounded-full border-2 border-primary bg-background shadow-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 hover:scale-110"
          aria-label={label || props['aria-label']}
        />
      </SliderPrimitive.Root>
    </div>
  );
});

CompactSlider.displayName = "CompactSlider";

export { CompactSlider };
