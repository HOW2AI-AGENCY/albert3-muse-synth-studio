import {
  forwardRef,
  ReactNode,
  ButtonHTMLAttributes
} from 'react';
import { cn } from '@/lib/utils';

/**
 * 🎯 AccessibleButton - Доступная кнопка с полной поддержкой ARIA
 */
interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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
