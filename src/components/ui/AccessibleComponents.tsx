import React, { 
  forwardRef, 
  useState, 
  useEffect, 
  useRef, 
  ReactNode, 
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes
} from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, AlertCircle, Info, CheckCircle, X } from 'lucide-react';

/**
 * 🎯 AccessibleButton - Доступная кнопка с полной поддержкой ARIA
 */
interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  children: ReactNode;
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText = 'Загрузка...',
    leftIcon,
    rightIcon,
    fullWidth = false,
    children,
    className,
    disabled,
    ...props
  }, ref) => {
    const variants = {
      primary: 'bg-primary text-on-primary hover:bg-primary/90 focus:ring-primary/20',
      secondary: 'bg-secondary text-on-secondary hover:bg-secondary/90 focus:ring-secondary/20',
      outline: 'border-2 border-outline text-on-surface hover:bg-surface-variant focus:ring-primary/20',
      ghost: 'text-primary hover:bg-primary/10 focus:ring-primary/20',
      danger: 'bg-error text-on-error hover:bg-error/90 focus:ring-error/20',
      default: 'bg-surface text-on-surface hover:bg-surface-variant focus:ring-primary/20',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm min-h-[32px]',
      md: 'px-4 py-2 text-base min-h-[40px]',
      lg: 'px-6 py-3 text-lg min-h-[48px]',
      xl: 'px-8 py-4 text-xl min-h-[56px]',
    };

    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(
          // Базовые стили
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-all duration-200 ease-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'active:scale-95',
          
          // Доступность
          'focus-visible:ring-2 focus-visible:ring-offset-2',
          
          // Размеры
          sizes[size],
          
          // Варианты
          variants[variant],
          
          // Состояния
          isDisabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          fullWidth && 'w-full',
          
          className
        )}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            {loadingText}
          </>
        ) : (
          <>
            {leftIcon && <span className="flex-shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';

/**
 * 📝 AccessibleInput - Доступное поле ввода
 */
interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  helpText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  showLabel?: boolean;
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({
    label,
    error,
    hint,
    helpText,
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

        {/* Help Text */}
        {helpText && !error && !hint && (
          <p className="text-sm text-on-surface-variant">
            {helpText}
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

        {/* Help Text */}
        {helpText && !error && !hint && (
          <p className="text-sm text-on-surface-variant">
            {helpText}
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
  helpText?: string;
  showLabel?: boolean;
  placeholder?: string;
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({
    label,
    options,
    error,
    hint,
    helpText,
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

/**
 * ☑️ AccessibleCheckbox - Доступный чекбокс
 */
interface AccessibleCheckboxProps {
  id?: string;
  label: string;
  description?: string;
  helpText?: string;
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
  helpText,
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

          {helpText && !description && (
            <p className="text-sm text-on-surface-variant mt-1">
              {helpText}
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

/**
 * 💬 AccessibleToast - Доступное уведомление
 */
interface AccessibleToastProps {
  type?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
}

export const AccessibleToast: React.FC<AccessibleToastProps> = ({
  type = 'info',
  title,
  message,
  onClose,
  autoClose = true,
  duration = 5000,
  className,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => onClose?.(), 300);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const icons = {
    info: Info,
    success: CheckCircle,
    warning: AlertCircle,
    error: AlertCircle,
  };

  const styles = {
    info: 'bg-info-container text-on-info-container border-info',
    success: 'bg-success-container text-on-success-container border-success',
    warning: 'bg-warning-container text-on-warning-container border-warning',
    error: 'bg-error-container text-on-error-container border-error',
  };

  const Icon = icons[type];

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border-l-4 shadow-elevation-2',
        'transition-all duration-300 ease-out',
        styles[type],
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full',
        className
      )}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      
      <div className="flex-1 min-w-0">
        <h4 className="font-medium">{title}</h4>
        {message && (
          <p className="text-sm mt-1 opacity-90">{message}</p>
        )}
      </div>

      {onClose && (
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose(), 300);
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Закрыть уведомление"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export default {
  AccessibleButton,
  AccessibleInput,
  AccessibleTextarea,
  AccessibleSelect,
  AccessibleCheckbox,
  AccessibleRadioGroup,
  AccessibleToast,
};