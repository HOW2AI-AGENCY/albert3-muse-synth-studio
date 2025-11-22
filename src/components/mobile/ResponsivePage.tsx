import { cn } from "@/lib/utils"

type ResponsivePageProps = {
  children: React.ReactNode
  className?: string
}

export function ResponsivePage({ children, className }: ResponsivePageProps) {
  return (
    <div className={cn("flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-background pb-safe", className)} style={{
      paddingBottom: 'calc(var(--workspace-bottom-offset) + env(safe-area-inset-bottom, 0px))'
    }}>
      {children}
    </div>
  )
}