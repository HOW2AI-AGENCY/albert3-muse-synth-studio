import React, { useState, useEffect, useCallback, memo } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface DebouncedInputProps {
  value: string;
  onChange: (value: string) => void;
  delay?: number;
  multiline?: boolean;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  rows?: number;
}

/**
 * Debounced input component for form optimization
 * Prevents excessive re-renders and API calls
 */
const DebouncedInputComponent: React.FC<DebouncedInputProps> = ({
  value: externalValue,
  onChange,
  delay = 300,
  multiline = false,
  placeholder,
  className,
  maxLength,
  rows = 4,
}) => {
  const [internalValue, setInternalValue] = useState(externalValue);

  // Sync internal value with external value
  useEffect(() => {
    setInternalValue(externalValue);
  }, [externalValue]);

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (internalValue !== externalValue) {
        onChange(internalValue);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [internalValue, externalValue, onChange, delay]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
  }, []);

  const Component = multiline ? Textarea : Input;

  return (
    <Component
      value={internalValue}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
      maxLength={maxLength}
      rows={multiline ? rows : undefined}
    />
  );
};

export const DebouncedInput = memo(DebouncedInputComponent);
DebouncedInput.displayName = 'DebouncedInput';
