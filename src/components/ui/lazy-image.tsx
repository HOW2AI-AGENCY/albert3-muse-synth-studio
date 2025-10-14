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
  placeholder = '/placeholder.svg',
  className,
  wrapperClassName,
  ...props 
}: LazyImageProps) => {
  const [imageSrc, setImageSrc] = useState<string>(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const handleIntersection = (entry: IntersectionObserverEntry) => {
    if (entry.isIntersecting && imageSrc === placeholder) {
      setImageSrc(src);
    }
  };

  const imgRef = useIntersectionObserver(handleIntersection, {
    threshold: 0.1,
    rootMargin: '50px'
  });

  useEffect(() => {
    if (imageSrc === src && !isLoaded && !isError) {
      const img = new Image();
      img.src = src;
      
      img.onload = () => {
        setIsLoaded(true);
      };
      
      img.onerror = () => {
        setIsError(true);
        setImageSrc(placeholder);
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
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        loading="lazy"
        {...props}
      />
      {!isLoaded && !isError && (
        <div className="absolute inset-0 bg-gradient-to-br from-muted to-muted/50 animate-pulse" />
      )}
    </div>
  );
});

LazyImage.displayName = 'LazyImage';
