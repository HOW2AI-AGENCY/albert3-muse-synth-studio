import React from 'react';
import { cn } from '@/lib/utils';
import { Check, AlertCircle } from 'lucide-react';

/**
 * ☑️ AccessibleCheckbox - Доступный чекбокс
 */
interface AccessibleCheckboxProps {
  id?: string;
  label: string;
  description?: string;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
}

export const AccessibleCheckbox: React.FC<AccessibleCheckboxProps> = ({
  id,
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  required = false,
  error,
  className,
}) => {
  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  const descriptionId = description ? `${checkboxId}-description` : undefined;
  const errorId = error ? `${checkboxId}-error` : undefined;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            type="checkbox"
            id={checkboxId}
            checked={checked}
            onChange={(e) => onChange?.(e.target.checked)}
            disabled={disabled}
            required={required}
            className="sr-only"
            aria-invalid={!!error}
            aria-describedby={cn(
              descriptionId && descriptionId,
              errorId && errorId
            ).trim() || undefined}
          />

          <div
            className={cn(
              'w-5 h-5 border-2 rounded transition-all duration-200 cursor-pointer',
              'flex items-center justify-center',

              // Состояния
              checked
                ? 'bg-primary border-primary text-on-primary'
                : 'bg-surface border-outline hover:border-outline-variant',

              // Ошибка
              error && 'border-error',

              // Отключено
              disabled && 'opacity-50 cursor-not-allowed',

              // Фокус
              'focus-within:ring-2 focus-within:ring-primary/20'
            )}
            onClick={() => !disabled && onChange?.(!checked)}
          >
            {checked && <Check className="w-3 h-3" />}
          </div>
        </div>

        {/* Label and Description */}
        <div className="flex-1">
          <label
            htmlFor={checkboxId}
            className={cn(
              'block text-sm font-medium text-on-surface cursor-pointer',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          >
            {label}
            {required && (
              <span className="text-error ml-1" aria-label="обязательное поле">*</span>
            )}
          </label>

          {description && (
            <p id={descriptionId} className="text-sm text-on-surface-variant mt-1">
              {description}
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <p id={errorId} className="text-sm text-error flex items-center gap-1" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
};
