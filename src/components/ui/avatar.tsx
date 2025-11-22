import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  fallback?: string
  size?: 'sm' | 'default' | 'lg' | 'xl'
}

const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, alt, fallback, size = 'default', ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)
    const [imageLoaded, setImageLoaded] = React.useState(false)

    const sizeClasses = {
      sm: 'h-8 w-8 text-xs',
      default: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base',
      xl: 'h-16 w-16 text-lg',
    }

    const handleImageLoad = () => {
      setImageLoaded(true)
    }

    const handleImageError = () => {
      setImageError(true)
    }

    const shouldShowImage = src && !imageError

    return (
      <div
        ref={ref}
        className={cn(
          'relative flex shrink-0 overflow-hidden rounded-full bg-muted',
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {shouldShowImage ? (
          <img
            src={src}
            alt={alt || 'Avatar'}
            className={cn(
              'aspect-square h-full w-full object-cover transition-opacity',
              imageLoaded ? 'opacity-100' : 'opacity-0'
            )}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        ) : fallback ? (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <span className="text-muted-foreground">{fallback}</span>
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <svg
              className="h-1/2 w-1/2 text-muted-foreground"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        )}
      </div>
    )
  }
)
Avatar.displayName = 'Avatar'

export interface AvatarGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  max?: number
  size?: 'sm' | 'default' | 'lg' | 'xl'
}

const AvatarGroup = React.forwardRef<HTMLDivElement, AvatarGroupProps>(
  ({ className, children, max = 5, size = 'default', ...props }, ref) => {
    const childrenArray = React.Children.toArray(children)
    const visibleChildren = childrenArray.slice(0, max)
    const remainingCount = childrenArray.length - max

    const sizeClasses = {
      sm: '-ml-2',
      default: '-ml-2',
      lg: '-ml-3',
      xl: '-ml-4',
    }

    return (
      <div
        ref={ref}
        className={cn('flex items-center', className)}
        {...props}
      >
        {visibleChildren.map((child, index) => (
          <div key={index} className={cn(index > 0 && sizeClasses[size])}>
            {child}
          </div>
        ))}
        {remainingCount > 0 && (
          <div className={cn('flex items-center justify-center rounded-full bg-muted text-muted-foreground', sizeClasses[size])}>
            <div
              className={cn(
                'flex items-center justify-center rounded-full border-2 border-background bg-muted',
                size === 'sm' && 'h-8 w-8 text-xs',
                size === 'default' && 'h-10 w-10 text-sm',
                size === 'lg' && 'h-12 w-12 text-base',
                size === 'xl' && 'h-16 w-16 text-lg',
              )}
            >
              +{remainingCount}
            </div>
          </div>
        )}
      </div>
    )
  }
)
AvatarGroup.displayName = 'AvatarGroup'

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {}

const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ className, onError, onLoad, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false)
    const [imageLoaded, setImageLoaded] = React.useState(false)

    const handleImageLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
      setImageLoaded(true)
      onLoad?.(event)
    }

    const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>) => {
      setImageError(true)
      onError?.(event)
    }

    if (imageError) return null

    return (
      <img
        ref={ref}
        className={cn(
          'aspect-square h-full w-full object-cover transition-opacity',
          imageLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        onLoad={handleImageLoad}
        onError={handleImageError}
        {...props}
      />
    )
  }
)
AvatarImage.displayName = 'AvatarImage'

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {}

const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex h-full w-full items-center justify-center bg-muted',
        className
      )}
      {...props}
    />
  )
)
AvatarFallback.displayName = 'AvatarFallback'

export { Avatar, AvatarGroup, AvatarImage, AvatarFallback }
