import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 transition-colors transition-transform active:scale-95",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground hover:shadow-md",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-sm",
        link: "text-primary underline-offset-4 hover:underline",
        gradient: "bg-gradient-to-r from-accent-purple to-accent-pink text-white shadow-sm hover:shadow-lg hover:shadow-accent-purple/25 transform hover:scale-105",
        glass: "glass-effect border border-white/20 text-white backdrop-blur-sm hover:bg-white/10 hover:shadow-lg",
        success: "bg-success text-white shadow-sm hover:bg-success/90 hover:shadow-md",
        warning: "bg-warning text-white shadow-sm hover:bg-warning/90 hover:shadow-md",
        error: "bg-error text-white shadow-sm hover:bg-error/90 hover:shadow-md",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-12 rounded-md px-8 text-base",
        xl: "h-14 rounded-lg px-10 text-lg font-semibold",
        icon: "h-10 w-10",
        "icon-sm": "h-8 w-8",
        "icon-lg": "h-12 w-12",
      },
      state: {
        default: "",
        loading: "relative overflow-hidden",
        success: "bg-success text-white",
        error: "bg-error text-white",
        warning: "bg-warning text-white",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      state: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  success?: boolean;
  error?: boolean;
  warning?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const EnhancedButton = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    state,
    loading = false,
    success = false,
    error = false,
    warning = false,
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    disabled,
    asChild = false,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button";
    
    // Determine state based on props
    let currentState: typeof state = "default";
    if (loading) currentState = "loading";
    else if (success) currentState = "success";
    else if (error) currentState = "error";
    else if (warning) currentState = "warning";

    // State icons
    const stateIcons = {
      loading: <Loader2 className="h-4 w-4 animate-spin" />,
      success: <CheckCircle className="h-4 w-4" />,
      error: <XCircle className="h-4 w-4" />,
      warning: <AlertCircle className="h-4 w-4" />,
    };

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, state: currentState, className }),
          fullWidth && "w-full",
          "haptic-medium"
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-inherit rounded-md">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {/* Content with conditional visibility */}
        <span className={cn(
          "flex items-center gap-2 transition-opacity duration-200",
          loading && "opacity-0"
        )}>
          {/* Left icon or state icon */}
          {!loading && currentState !== "default" && stateIcons[currentState] ? (
            stateIcons[currentState]
          ) : leftIcon ? (
            leftIcon
          ) : null}

          {children}

          {/* Right icon */}
          {rightIcon && !loading && currentState === "default" && rightIcon}
        </span>

        {/* Success/Error/Warning pulse effect */}
        {(success || error || warning) && !loading && (
          <span className={cn(
            "absolute inset-0 rounded-md animate-pulse opacity-20",
            success && "bg-success",
            error && "bg-error",
            warning && "bg-warning"
          )} />
        )}
      </Comp>
    );
  }
);

EnhancedButton.displayName = "EnhancedButton";

// Экспортируем только компонент, чтобы соответствовать правилам Fast Refresh
export { EnhancedButton };