import React from 'react';
import { cn } from '@/lib/utils';
import { useLazyImage } from '@/hooks/useIntersectionObserver';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: React.ReactNode;
  skeletonClassName?: string;
  containerClassName?: string;
}

/**
 * Компонент для ленивой загрузки изображений с плейсхолдером
 */
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder = '/placeholder.svg',
  fallback,
  className,
  skeletonClassName,
  containerClassName,
  ...props
}) => {
  const { ref, src: imageSrc, isLoaded, isVisible } = useLazyImage(src, placeholder);

  return (
    <div ref={ref} className={cn('relative overflow-hidden bg-muted', containerClassName)}>
      {/* Skeleton во время загрузки */}
      {!isLoaded && isVisible && (
        <Skeleton 
          className={cn(
            'absolute inset-0 w-full h-full',
            skeletonClassName
          )} 
        />
      )}
      
      {/* Изображение */}
      {(isVisible || isLoaded) && (
        <img
          src={imageSrc || placeholder}
          alt={alt}
          className={cn(
            'w-full h-full object-cover transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          loading="lazy"
          {...props}
          onError={(e) => {
            if (fallback) {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }
            props.onError?.(e);
          }}
        />
      )}
      
      {/* Fallback контент при ошибке загрузки */}
      {isLoaded && !imageSrc && fallback && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          {fallback}
        </div>
      )}
    </div>
  );
};

export default LazyImage;