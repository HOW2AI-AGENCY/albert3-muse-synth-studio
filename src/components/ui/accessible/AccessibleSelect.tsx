import React, {
  forwardRef,
  SelectHTMLAttributes
} from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, ChevronDown } from 'lucide-react';

/**
 * 📋 AccessibleSelect - Доступный выпадающий список
 */
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface AccessibleSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  showLabel?: boolean;
  placeholder?: string;
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({
    label,
    options,
    error,
    hint,
    showLabel = true,
    placeholder,
    className,
    id,
    ...props
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const hintId = hint ? `${selectId}-hint` : undefined;

    return (
      <div className="space-y-2">
        {/* Label */}
        {showLabel && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-on-surface"
          >
            {label}
            {props.required && (
              <span className="text-error ml-1" aria-label="обязательное поле">*</span>
            )}
          </label>
        )}

        {/* Select Container */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              // Базовые стили
              'w-full px-3 py-2 pr-10 border border-outline rounded-lg',
              'bg-surface text-on-surface',
              'transition-all duration-200 ease-out',
              'appearance-none cursor-pointer',

              // Фокус и состояния
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'hover:border-outline-variant',

              // Ошибка
              error && 'border-error focus:border-error focus:ring-error/20',

              // Доступность
              'min-h-[40px]',

              className
            )}
            aria-invalid={!!error}
            aria-describedby={cn(
              errorId && errorId,
              hintId && hintId
            ).trim() || undefined}
            aria-label={!showLabel ? label : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
          </select>

          {/* Chevron Icon */}
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-on-surface-variant pointer-events-none" />
        </div>

        {/* Hint */}
        {hint && !error && (
          <p id={hintId} className="text-sm text-on-surface-variant">
            {hint}
          </p>
        )}

        {/* Error */}
        {error && (
          <p id={errorId} className="text-sm text-error flex items-center gap-1" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleSelect.displayName = 'AccessibleSelect';
