import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  rounded?: boolean
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, rounded = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'animate-pulse bg-muted',
          rounded && 'rounded-md',
          className
        )}
        {...props}
      />
    )
  }
)
Skeleton.displayName = 'Skeleton'

export interface SkeletonTextProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number
  width?: string | string[]
}

const SkeletonText = ({ 
  className, 
  lines = 3, 
  width = ['w-3/4', 'w-full', 'w-2/3'],
  ...props 
}: SkeletonTextProps) => {
  const widths = Array.isArray(width) ? width : [width]
  
  return (
    <div className={cn('space-y-2', className)} {...props}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', widths[i % widths.length])}
        />
      ))}
    </div>
  )
}

export interface SkeletonAvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg' | 'xl'
}

const SkeletonAvatar = ({ 
  className, 
  size = 'default',
  ...props 
}: SkeletonAvatarProps) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    default: 'h-10 w-10',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }

  return (
    <Skeleton
      className={cn('rounded-full', sizeClasses[size], className)}
      {...props}
    />
  )
}

export interface SkeletonCardProps extends React.HTMLAttributes<HTMLDivElement> {
  withImage?: boolean
  lines?: number
}

const SkeletonCard = ({ 
  className, 
  withImage = true,
  lines = 3,
  ...props 
}: SkeletonCardProps) => {
  return (
    <div className={cn('space-y-3', className)} {...props}>
      {withImage && <Skeleton className="h-48 w-full rounded-lg" />}
      <div className="space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <SkeletonText lines={lines - 1} />
      </div>
    </div>
  )
}

export { Skeleton, SkeletonText, SkeletonAvatar, SkeletonCard }
