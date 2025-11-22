import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";

// Импортируем RippleEffect из MobileUIPatterns
import { RippleEffect } from "@/components/mobile/MobileUIPatterns";

// Импортируем buttonVariants из Button компонента для консистентности
import { buttonVariants } from "./button";

export interface HapticButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  hapticStyle?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  rippleColor?: string;
  rippleDuration?: number;
  disabled?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onTouchStart?: (event: React.TouchEvent<HTMLButtonElement>) => void;
  onMouseDown?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}

const HapticButton = React.forwardRef<HTMLButtonElement, HapticButtonProps>(
  ({
    className,
    variant,
    size,
    asChild = false,
    hapticStyle = 'light',
    rippleColor,
    rippleDuration = 600,
    disabled = false,
    onClick,
    onTouchStart,
    onMouseDown,
    children,
    ...props
  }, ref) => {
    const { vibrate } = useHapticFeedback();

    // Обработчик клика с тактильной обратной связью
    const handleClick = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        vibrate(hapticStyle);
      }
      onClick?.(event);
    }, [disabled, hapticStyle, vibrate, onClick]);

    // Обработчик touch start с тактильной обратной связью
    const handleTouchStart = React.useCallback((event: React.TouchEvent<HTMLButtonElement>) => {
      if (!disabled) {
        vibrate('light'); // Легкая вибрация для touch
      }
      onTouchStart?.(event);
    }, [disabled, vibrate, onTouchStart]);

    // Обработчик mouse down с тактильной обратной связью (для десктопа)
    const handleMouseDown = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled) {
        vibrate('light'); // Легкая вибрация для mouse
      }
      onMouseDown?.(event);
    }, [disabled, vibrate, onMouseDown]);

    const Comp = asChild ? Slot : "button";

    // Определяем цвет ripple эффекта на основе варианта кнопки
    const getRippleColor = React.useMemo(() => {
      if (rippleColor) return rippleColor;

      // Используем дизайн-токены для определения цвета ripple
      switch (variant) {
        case 'destructive':
          return 'rgba(239, 68, 68, 0.3)'; // error color
        case 'secondary':
          return 'rgba(148, 163, 184, 0.2)'; // muted foreground
        case 'outline':
          return 'rgba(71, 85, 105, 0.3)'; // foreground
        case 'ghost':
          return 'rgba(71, 85, 105, 0.2)'; // foreground
        case 'link':
          return 'rgba(59, 130, 246, 0.3)'; // primary
        case 'hero':
          return 'rgba(139, 92, 246, 0.4)'; // accent purple
        case 'glass':
          return 'rgba(255, 255, 255, 0.2)'; // white
        case 'glow':
          return 'rgba(139, 92, 246, 0.4)'; // accent purple
        default: // primary and other variants
          return 'rgba(139, 92, 246, 0.3)'; // accent purple
      }
    }, [variant, rippleColor]);

    return (
      <RippleEffect
        color={getRippleColor}
        duration={rippleDuration}
        disabled={disabled}
        className={cn(
          // Убираем ripple эффект для disabled состояния
          disabled && "pointer-events-none"
        )}
      >
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          disabled={disabled}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onMouseDown={handleMouseDown}
          {...props}
        >
          {children}
        </Comp>
      </RippleEffect>
    );
  },
);

HapticButton.displayName = "HapticButton";

export { HapticButton };