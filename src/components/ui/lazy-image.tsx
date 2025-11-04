import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useIntersectionObserver } from '@/utils/performance';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
}

export const LazyImage = React.memo(({ 
  src, 
  alt, 
  placeholder = `${import.meta.env.BASE_URL || '/'}placeholder.svg`,
  className,
  wrapperClassName,
  ...props 
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);
  const hasStartedLoading = React.useRef(false);

  const handleIntersection = (entry: IntersectionObserverEntry) => {
    if (entry.isIntersecting && !hasStartedLoading.current && src) {
      hasStartedLoading.current = true;
      setImageSrc(src);
    }
  };

  const imgRef = useIntersectionObserver(handleIntersection, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  useEffect(() => {
    if (!src) {
      setImageSrc(placeholder);
      setIsError(true);
      return;
    }

    if (imageSrc === src && !isLoaded && !isError) {
      const img = new Image();
      img.src = src;
      
      img.onload = () => {
        setIsLoaded(true);
        setIsError(false);
      };
      
      img.onerror = () => {
        setIsError(true);
        setImageSrc(placeholder);
        setIsLoaded(true);
      };
    }
  }, [imageSrc, src, placeholder, isLoaded, isError]);

  return (
    <div 
      ref={imgRef as React.RefObject<HTMLDivElement>}
      className={cn('relative overflow-hidden bg-muted', wrapperClassName)}
    >
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading="lazy"
        {...props}
      />
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
