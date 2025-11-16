/**
 * Debounced Value Hook
 * Delays updating a value until after a specified delay
 * 
 * @example
 * const debouncedSearch = useDebouncedValue(searchQuery, 300);
 */

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
