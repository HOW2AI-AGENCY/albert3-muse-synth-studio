/**
 * Progressive Image Component
 * Week 3: Smart Loading & Caching
 * 
 * Loads images progressively with blur-up effect
 */

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ProgressiveImageProps {
  src: string;
  placeholderSrc?: string;
  alt: string;
  className?: string;
  blurDataURL?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const ProgressiveImage = React.memo(({
  src,
  placeholderSrc,
  alt,
  className,
  blurDataURL,
  onLoad,
  onError,
}: ProgressiveImageProps) => {
  const [imageSrc, setImageSrc] = useState(placeholderSrc || blurDataURL || src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    // Create image loader
    const img = new Image();
    
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      onError?.();
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  if (hasError) {
    return (
      <div className={cn(
        'flex items-center justify-center bg-muted text-muted-foreground',
        className
      )}>
        <span className="text-xs">Не удалось загрузить</span>
      </div>
    );
  }

  return (
    <img
      src={imageSrc}
      alt={alt}
      className={cn(
        'transition-all duration-500',
        isLoading && 'blur-lg scale-105',
        !isLoading && 'blur-0 scale-100',
        className
      )}
      loading="lazy"
      decoding="async"
    />
  );
});

ProgressiveImage.displayName = 'ProgressiveImage';
