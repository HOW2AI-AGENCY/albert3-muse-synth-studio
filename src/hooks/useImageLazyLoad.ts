/**
 * useImageLazyLoad - Lazy loading hook for images
 * Uses Intersection Observer API for efficient loading
 */

import { useState, useEffect, useRef } from 'react';

interface UseImageLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
}

export const useImageLazyLoad = (
  src: string | null | undefined,
  options: UseImageLazyLoadOptions = {}
) => {
  const { threshold = 0.1, rootMargin = '50px' } = options;
  
  const [imageSrc, setImageSrc] = useState<string | undefined>(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  
  useEffect(() => {
    if (!src) {
      setError(true);
      return;
    }
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      { threshold, rootMargin }
    );
    
    const currentImg = imgRef.current;
    if (currentImg) {
      observer.observe(currentImg);
    }
    
    return () => {
      if (currentImg) {
        observer.unobserve(currentImg);
      }
    };
  }, [src, threshold, rootMargin]);
  
  useEffect(() => {
    if (!imageSrc) return;
    
    const img = new Image();
    img.src = imageSrc;
    
    img.onload = () => {
      setIsLoaded(true);
      setError(false);
    };
    
    img.onerror = () => {
      setError(true);
      setIsLoaded(false);
    };
  }, [imageSrc]);
  
  return { imgRef, imageSrc, isLoaded, error };
};
