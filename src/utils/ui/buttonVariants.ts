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
        hero: "bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground hover:opacity-90 hover:shadow-glow transition-all animate-pulse-glow",
        glow: "bg-gradient-to-r from-secondary to-primary text-primary-foreground hover:opacity-90 glow-secondary transition-all hover:scale-105",
        neon: "bg-primary text-primary-foreground shadow-neon hover:shadow-glow transition-all hover:scale-105",
        modern: "bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl border border-border/30 hover:border-primary/30 hover:shadow-xl text-foreground",
        glass: "bg-card/20 backdrop-blur-xl border border-border/20 hover:bg-card/30 hover:border-primary/30 text-foreground",
        fab: "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg glow-primary-strong hover:from-primary/90 hover:to-primary touch-optimized",
      },
      size: {
        default: "h-control-xl px-4", /* Adjusted to 48px for WCAG touch target */
        sm: "h-control-sm rounded-sm px-3 text-xs",
        lg: "h-control-lg rounded-lg px-8 text-base",
        xl: "h-control-xl rounded-lg px-10 text-lg",
        icon: "h-control-xl w-control-xl", /* Adjusted to 48px for WCAG touch target */
        "icon-sm": "h-control-sm w-control-sm",
        "icon-lg": "h-control-lg w-control-lg",
        fab: "h-14 w-14 rounded-full touch-optimized", /* Ensure FAB is touch-optimized */
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);