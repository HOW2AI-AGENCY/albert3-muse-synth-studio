import * as React from 'react'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'

export interface SheetProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const SheetContext = React.createContext<{
  open: boolean
  onOpenChange: (open: boolean) => void
} | null>(null)

const Sheet = ({ open = false, onOpenChange, children }: SheetProps) => {
  const [internalOpen, setInternalOpen] = React.useState(open)
  
  const currentOpen = open !== undefined ? open : internalOpen
  
  const handleOpenChange = (newOpen: boolean) => {
    if (open === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && currentOpen) {
        handleOpenChange(false)
      }
    }

    if (currentOpen) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
      return () => {
        document.removeEventListener('keydown', handleEscape)
        document.body.style.overflow = 'unset'
      }
    }
  }, [currentOpen])

  return (
    <SheetContext.Provider value={{ open: currentOpen, onOpenChange: handleOpenChange }}>
      {children}
    </SheetContext.Provider>
  )
}

export interface SheetTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const SheetTrigger = React.forwardRef<HTMLButtonElement, SheetTriggerProps>(
  ({ className, children, asChild = false, ...props }, ref) => {
    const context = React.useContext(SheetContext)
    if (!context) throw new Error('SheetTrigger must be used within Sheet')

    const { onOpenChange } = context

    const Comp = asChild ? React.Fragment : 'button'

    return (
      <Comp
        ref={ref as any}
        className={cn(!asChild && 'cursor-pointer', className)}
        onClick={() => onOpenChange(true)}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
SheetTrigger.displayName = 'SheetTrigger'

export interface SheetPortalProps {
  children: React.ReactNode
}

const SheetPortal = ({ children }: SheetPortalProps) => {
  const context = React.useContext(SheetContext)
  if (!context) throw new Error('SheetPortal must be used within Sheet')

  const { open } = context

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      {children}
    </div>
  )
}

export interface SheetOverlayProps extends React.HTMLAttributes<HTMLDivElement> {}

const SheetOverlay = React.forwardRef<HTMLDivElement, SheetOverlayProps>(
  ({ className, ...props }, ref) => {
    const context = React.useContext(SheetContext)
    if (!context) throw new Error('SheetOverlay must be used within Sheet')

    const { onOpenChange } = context

    return (
      <div
        ref={ref}
        className={cn(
          'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          className
        )}
        onClick={() => onOpenChange(false)}
        {...props}
      />
    )
  }
)
SheetOverlay.displayName = 'SheetOverlay'

export interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: 'top' | 'right' | 'bottom' | 'left'
  hideCloseButton?: boolean
}

const sheetVariants = {
  top: 'inset-x-0 top-0 border-b',
  bottom: 'inset-x-0 bottom-0 border-t',
  left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm',
  right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm',
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, side = 'right', hideCloseButton = false, ...props }, ref) => {
    const context = React.useContext(SheetContext)
    if (!context) throw new Error('SheetContent must be used within Sheet')

    const { onOpenChange } = context

    return (
      <SheetPortal>
        <SheetOverlay />
        <div
          ref={ref}
          className={cn(
            'fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500',
            sheetVariants[side],
            side === 'top' && 'data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
            side === 'bottom' && 'data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
            side === 'left' && 'data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left',
            side === 'right' && 'data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            className
          )}
          {...props}
        >
          {children}
          {!hideCloseButton && (
            <button
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          )}
        </div>
      </SheetPortal>
    )
  }
)
SheetContent.displayName = 'SheetContent'

export interface SheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const SheetHeader = ({ className, ...props }: SheetHeaderProps) => (
  <div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />
)
SheetHeader.displayName = 'SheetHeader'

export interface SheetFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

const SheetFooter = ({ className, ...props }: SheetFooterProps) => (
  <div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />
)
SheetFooter.displayName = 'SheetFooter'

export interface SheetTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const SheetTitle = React.forwardRef<HTMLHeadingElement, SheetTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold', className)}
      {...props}
    />
  )
)
SheetTitle.displayName = 'SheetTitle'

export interface SheetDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const SheetDescription = React.forwardRef<HTMLParagraphElement, SheetDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
  )
)
SheetDescription.displayName = 'SheetDescription'

export interface SheetCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean
}

const SheetClose = React.forwardRef<HTMLButtonElement, SheetCloseProps>(
  ({ className, children, asChild = false, ...props }, ref) => {
    const context = React.useContext(SheetContext)
    if (!context) throw new Error('SheetClose must be used within Sheet')

    const { onOpenChange } = context

    const Comp = asChild ? React.Fragment : 'button'

    return (
      <Comp
        ref={ref as any}
        className={cn(!asChild && 'cursor-pointer', className)}
        onClick={() => onOpenChange(false)}
        {...props}
      >
        {children}
      </Comp>
    )
  }
)
SheetClose.displayName = 'SheetClose'

export {
  Sheet,
  SheetTrigger,
  SheetPortal,
  SheetOverlay,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetClose,
}
