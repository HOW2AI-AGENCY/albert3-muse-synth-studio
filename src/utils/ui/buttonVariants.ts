import { cva } from "class-variance-authority";

// Вынесено из компонента Button: утилита вариантов стилей кнопки
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 button-modern focus-ring",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg",
        outline: "border-2 border-primary bg-transparent hover:bg-primary/10 text-foreground hover:border-primary/70",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-md",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
      },
      size: {
        default: "h-control-xl px-4",
        sm: "h-control-sm rounded-sm px-3 text-xs",
        lg: "h-control-lg rounded-lg px-8 text-base",
        icon: "h-control-xl w-control-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);