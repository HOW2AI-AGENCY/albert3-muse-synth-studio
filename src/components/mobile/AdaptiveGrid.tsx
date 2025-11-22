import { cn } from "@/lib/utils"

type AdaptiveGridProps<T> = {
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
}

export function AdaptiveGrid<T>({ items, renderItem, className }: AdaptiveGridProps<T>) {
  return (
    <div className={cn(
      "grid gap-3",
      "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5",
      className
    )}>
      {items.map((item, i) => renderItem(item, i))}
    </div>
  )
}