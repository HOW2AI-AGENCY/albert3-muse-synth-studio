import React, {
  forwardRef,
  ReactNode,
  InputHTMLAttributes
} from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

/**
 * 📝 AccessibleInput - Доступное поле ввода
 */
interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showLabel?: boolean;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    showLabel = true,
    className,
    id,
    ...props
  }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const hintId = hint ? `${inputId}-hint` : undefined;

    return (
      <div className="space-y-2">
        {/* Label */}
        {showLabel && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-on-surface"
          >
            {label}
            {props.required && (
              <span className="text-error ml-1" aria-label="обязательное поле">*</span>
            )}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Базовые стили
              'w-full px-3 py-2 border border-outline rounded-lg',
              'bg-surface text-on-surface placeholder-on-surface-variant',
              'transition-all duration-200 ease-out',

              // Фокус и состояния
              'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
              'hover:border-outline-variant',

              // Ошибка
              error && 'border-error focus:border-error focus:ring-error/20',

              // Отступы для иконок
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',

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
          />

          {rightIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant">
              {rightIcon}
            </div>
          )}
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

AccessibleInput.displayName = 'AccessibleInput';
