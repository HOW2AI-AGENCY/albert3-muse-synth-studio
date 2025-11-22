import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useNavigate } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

type MobileHeaderProps = {
  title: string
  className?: string
  showBack?: boolean
  onBackClick?: () => void
  rightSlot?: React.ReactNode
}

export function MobileHeader({ title, className, showBack = true, onBackClick, rightSlot }: MobileHeaderProps) {
  const navigate = useNavigate()
  return (
    <div className={cn("sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 border-b border-border/50 px-4 pt-safe pb-3", className)}>
      <div className="flex items-center justify-between gap-3">
        {showBack ? (
          <Button variant="outline" size="icon" className="h-10 w-10" onClick={onBackClick ?? (() => navigate(-1))}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        ) : (
          <div className="h-10 w-10" />
        )}
        <h1 className="text-base font-semibold truncate">{title}</h1>
        {rightSlot ?? <div className="h-10 w-10" />}
      </div>
    </div>
  )
}