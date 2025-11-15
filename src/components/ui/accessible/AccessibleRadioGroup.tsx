import React from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

/**
 * 🔘 AccessibleRadioGroup - Доступная группа радиокнопок
 */
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface AccessibleRadioGroupProps {
  name: string;
  label: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
}

export const AccessibleRadioGroup: React.FC<AccessibleRadioGroupProps> = ({
  name,
  label,
  options,
  value,
  onChange,
  error,
  hint,
  required = false,
  className,
}) => {
  const groupId = `radio-group-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${groupId}-error` : undefined;
  const hintId = hint ? `${groupId}-hint` : undefined;

  return (
    <fieldset className={cn('space-y-4', className)}>
      {/* Legend */}
      <legend className="block text-sm font-medium text-on-surface">
        {label}
        {required && (
          <span className="text-error ml-1" aria-label="обязательное поле">*</span>
        )}
      </legend>

      {/* Hint */}
      {hint && !error && (
        <p id={hintId} className="text-sm text-on-surface-variant">
          {hint}
        </p>
      )}

      {/* Options */}
      <div
        className="space-y-3"
        role="radiogroup"
        aria-labelledby={groupId}
        aria-invalid={!!error}
        aria-describedby={cn(
          errorId && errorId,
          hintId && hintId
        ).trim() || undefined}
      >
        {options.map((option) => {
          const optionId = `${name}-${option.value}`;
          const isSelected = value === option.value;

          return (
            <div key={option.value} className="flex items-start gap-3">
              {/* Radio Button */}
              <div className="relative flex-shrink-0 mt-0.5">
                <input
                  type="radio"
                  id={optionId}
                  name={name}
                  value={option.value}
                  checked={isSelected}
                  onChange={(e) => onChange?.(e.target.value)}
                  disabled={option.disabled}
                  className="sr-only"
                />

                <div
                  className={cn(
                    'w-5 h-5 border-2 rounded-full transition-all duration-200 cursor-pointer',
                    'flex items-center justify-center',

                    // Состояния
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'bg-surface border-outline hover:border-outline-variant',

                    // Ошибка
                    error && 'border-error',

                    // Отключено
                    option.disabled && 'opacity-50 cursor-not-allowed',

                    // Фокус
                    'focus-within:ring-2 focus-within:ring-primary/20'
                  )}
                  onClick={() => !option.disabled && onChange?.(option.value)}
                >
                  {isSelected && (
                    <div className="w-2 h-2 bg-on-primary rounded-full" />
                  )}
                </div>
              </div>

              {/* Label and Description */}
              <div className="flex-1">
                <label
                  htmlFor={optionId}
                  className={cn(
                    'block text-sm font-medium text-on-surface cursor-pointer',
                    option.disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {option.label}
                </label>

                {option.description && (
                  <p className="text-sm text-on-surface-variant mt-1">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <p id={errorId} className="text-sm text-error flex items-center gap-1" role="alert">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </p>
      )}
    </fieldset>
  );
};
