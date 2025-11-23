import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 touch-action-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300",
        glass: "bg-[hsl(var(--mv-surface-glass))] backdrop-blur-[var(--mv-blur-md)] border border-white/10 hover:bg-[hsl(var(--mv-surface-glass-hover))] text-foreground shadow-sm",
        glow: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[var(--shadow-glow-primary)] hover:shadow-[var(--shadow-glow-primary-strong)] transition-shadow duration-300",
      },
      size: {
        default: "h-10 px-4 py-2 min-h-[var(--mobile-touch-min)] min-w-[var(--mobile-touch-min)] md:min-h-0 md:min-w-0",
        sm: "h-9 rounded-md px-3 min-h-[var(--mobile-touch-min)] min-w-[var(--mobile-touch-min)] md:h-9 md:min-h-0 md:min-w-0",
        lg: "h-11 rounded-md px-8 min-h-[var(--mobile-touch-min)] md:h-11",
        icon: "h-10 w-10 min-h-[var(--mobile-touch-min)] min-w-[var(--mobile-touch-min)] md:h-10 md:w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
