import React, {
  forwardRef,
  TextareaHTMLAttributes
} from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

/**
 * 📄 AccessibleTextarea - Доступная текстовая область
 */
interface AccessibleTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
  showLabel?: boolean;
  resize?: boolean;
}

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({
    label,
    error,
    hint,
    showLabel = true,
    resize = true,
    className,
    id,
    ...props
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const hintId = hint ? `${textareaId}-hint` : undefined;

    return (
      <div className="space-y-2">
        {/* Label */}
        {showLabel && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-on-surface"
          >
            {label}
            {props.required && (
              <span className="text-error ml-1" aria-label="обязательное поле">*</span>
            )}
          </label>
        )}

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
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

            // Изменение размера
            resize ? 'resize-y' : 'resize-none',

            // Доступность
            'min-h-[80px]',

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

AccessibleTextarea.displayName = 'AccessibleTextarea';
