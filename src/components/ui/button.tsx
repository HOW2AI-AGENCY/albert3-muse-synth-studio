import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cn } from '@/lib/utils'

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link' | 'hero' | 'glass' | 'glow'
  size?: 'default' | 'sm' | 'lg' | 'xl' | 'icon' | 'icon-sm'
  loading?: boolean
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, asChild = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    
    return (
      <Comp
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
          'ring-offset-background transition-all duration-300',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:pointer-events-none disabled:opacity-50',
          'button-modern focus-ring',
          '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
          {
            // Default variants
            'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg': variant === 'default',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg': variant === 'destructive',
            'border-2 border-primary bg-transparent hover:bg-primary/10 text-foreground hover:border-primary/70': variant === 'outline',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg': variant === 'secondary',
            'hover:bg-accent hover:text-accent-foreground hover:shadow-md': variant === 'ghost',
            'text-primary underline-offset-4 hover:underline hover:text-primary/80': variant === 'link',
            
            // New modern variants
            'bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground hover:shadow-2xl hover:scale-105 font-bold': variant === 'hero',
            'bg-background/20 backdrop-blur-md border border-border/50 hover:bg-background/30 hover:border-border text-foreground': variant === 'glass',
            'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/50 hover:shadow-primary/80 hover:shadow-2xl': variant === 'glow',
          },
          {
            'h-10 px-4 py-2': size === 'default',
            'h-8 rounded-sm px-3 text-xs': size === 'sm',
            'h-12 rounded-lg px-8 text-base': size === 'lg',
            'h-14 rounded-xl px-10 text-lg': size === 'xl',
            'h-10 w-10': size === 'icon',
            'h-8 w-8': size === 'icon-sm',
          },
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <svg
            className="mr-2 h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </Comp>
    )
  }
)
Button.displayName = 'Button'

export const buttonVariants = ({
  variant = 'default',
  size = 'default',
}: {
  variant?: ButtonProps['variant']
  size?: ButtonProps['size']
}) => {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium',
    'ring-offset-background transition-all duration-300',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'button-modern focus-ring',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    {
      'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-lg': variant === 'default',
      'bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-lg': variant === 'destructive',
      'border-2 border-primary bg-transparent hover:bg-primary/10 text-foreground hover:border-primary/70': variant === 'outline',
      'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-lg': variant === 'secondary',
      'hover:bg-accent hover:text-accent-foreground hover:shadow-md': variant === 'ghost',
      'text-primary underline-offset-4 hover:underline hover:text-primary/80': variant === 'link',
      'bg-gradient-to-r from-primary via-primary/90 to-primary text-primary-foreground hover:shadow-2xl hover:scale-105 font-bold': variant === 'hero',
      'bg-background/20 backdrop-blur-md border border-border/50 hover:bg-background/30 hover:border-border text-foreground': variant === 'glass',
      'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/50 hover:shadow-primary/80 hover:shadow-2xl': variant === 'glow',
    },
    {
      'h-10 px-4 py-2': size === 'default',
      'h-8 rounded-sm px-3 text-xs': size === 'sm',
      'h-12 rounded-lg px-8 text-base': size === 'lg',
      'h-14 rounded-xl px-10 text-lg': size === 'xl',
      'h-10 w-10': size === 'icon',
      'h-8 w-8': size === 'icon-sm',
    }
  )
}

export { Button }
