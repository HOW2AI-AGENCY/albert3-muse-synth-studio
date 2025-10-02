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
  placeholder,
  fallback,
  className,
  skeletonClassName,
  containerClassName,
  ...props
}) => {
  const { ref, src: imageSrc, isLoaded, isVisible } = useLazyImage(src, placeholder);

  return (
    <div ref={ref} className={cn('relative overflow-hidden', containerClassName)}>
      {!isLoaded && isVisible && (
        <Skeleton 
          className={cn(
            'absolute inset-0 w-full h-full',
            skeletonClassName
          )} 
        />
      )}
      
      {isLoaded ? (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            'transition-opacity duration-300',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className
          )}
          {...props}
          onError={(e) => {
            // Показываем fallback при ошибке загрузки
            if (fallback) {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }
            props.onError?.(e);
          }}
        />
      ) : (
        // Показываем плейсхолдер до начала загрузки
        <div className={cn('bg-muted animate-pulse', className)} />
      )}
      
      {/* Fallback контент при ошибке загрузки */}
      {isLoaded && imageSrc === placeholder && fallback && (
        <div className="absolute inset-0 flex items-center justify-center">
          {fallback}
        </div>
      )}
    </div>
  );
};

export default LazyImage;