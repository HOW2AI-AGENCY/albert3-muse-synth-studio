import { useEffect, useRef, useState, useCallback } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  freezeOnceVisible?: boolean;
}

/**
 * Хук для отслеживания видимости элемента с помощью Intersection Observer API
 */
export const useIntersectionObserver = (
  options: UseIntersectionObserverOptions = {}
) => {
  const {
    threshold = 0,
    root = null,
    rootMargin = '0%',
    freezeOnceVisible = false
  } = options;

  const [entry, setEntry] = useState<IntersectionObserverEntry>();
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<Element>();

  const frozen = entry?.isIntersecting && freezeOnceVisible;

  const updateEntry = useCallback(([entry]: IntersectionObserverEntry[]) => {
    setEntry(entry);
    setIsVisible(entry.isIntersecting);
  }, []);

  useEffect(() => {
    const node = elementRef.current;
    const hasIOSupport = !!window.IntersectionObserver;

    if (!hasIOSupport || frozen || !node) return;

    const observerParams = { threshold, root, rootMargin };
    const observer = new IntersectionObserver(updateEntry, observerParams);

    observer.observe(node);

    return () => observer.disconnect();
  }, [elementRef, threshold, root, rootMargin, frozen, updateEntry]);

  const setRef = useCallback((node: Element | null) => {
    if (node) {
      elementRef.current = node;
    }
  }, []);

  return {
    ref: setRef,
    entry,
    isVisible,
    isIntersecting: entry?.isIntersecting ?? false
  };
};

/**
 * Хук для ленивой загрузки изображений
 */
export const useLazyImage = (src: string, placeholder?: string) => {
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const [isLoaded, setIsLoaded] = useState(false);
  const { ref, isVisible } = useIntersectionObserver({
    threshold: 0.1,
    freezeOnceVisible: true
  });

  useEffect(() => {
    if (isVisible && src && !isLoaded) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.onerror = () => {
        setImageSrc(placeholder || '');
        setIsLoaded(true);
      };
      img.src = src;
    }
  }, [isVisible, src, placeholder, isLoaded]);

  return {
    ref,
    src: imageSrc,
    isLoaded,
    isVisible
  };
};

/**
 * Хук для бесконечной прокрутки
 */
export const useInfiniteScroll = (
  callback: () => void,
  hasMore: boolean = true,
  threshold: number = 0.1
) => {
  const { ref, isVisible } = useIntersectionObserver({
    threshold,
    freezeOnceVisible: false
  });

  useEffect(() => {
    if (isVisible && hasMore) {
      callback();
    }
  }, [isVisible, hasMore, callback]);

  return { ref };
};