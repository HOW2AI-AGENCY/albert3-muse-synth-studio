import React, { 
  useState, 
  useEffect, 
  useRef, 
  ReactNode, 
  useCallback,
  TouchEvent,
  MouseEvent,
} from 'react';
import { cn } from '@/lib/utils';
// import { SmoothAnimation } from '../animations/SmoothAnimations';

/**
 * 🔄 Pull-to-Refresh компонент
 */
interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;
  maxPullDistance?: number;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  refreshThreshold = 80,
  maxPullDistance = 120,
  className,
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [startY, setStartY] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Haptic feedback (если поддерживается)
  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  // Обработка начала касания
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;

    setStartY(e.touches[0].clientY);
    setIsPulling(true);
  }, [disabled, isRefreshing]);

  // Обработка движения касания
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isPulling || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const distance = Math.max(0, currentY - startY);
    
    if (distance > 0) {
      e.preventDefault();
      const adjustedDistance = Math.min(distance * 0.5, maxPullDistance);
      setPullDistance(adjustedDistance);

      // Haptic feedback при достижении порога
      if (adjustedDistance >= refreshThreshold && pullDistance < refreshThreshold) {
        triggerHaptic('medium');
      }
    }
  }, [isPulling, disabled, isRefreshing, startY, maxPullDistance, refreshThreshold, pullDistance, triggerHaptic]);

  // Обработка окончания касания
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return;

    setIsPulling(false);

    if (pullDistance >= refreshThreshold && !isRefreshing) {
      setIsRefreshing(true);
      triggerHaptic('heavy');
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [isPulling, disabled, pullDistance, refreshThreshold, isRefreshing, onRefresh, triggerHaptic]);

  // Анимация возврата
  useEffect(() => {
    if (!isPulling && !isRefreshing && pullDistance > 0) {
      const animation = containerRef.current?.animate([
        { transform: `translateY(${pullDistance}px)` },
        { transform: 'translateY(0px)' }
      ], {
        duration: 300,
        easing: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
      });

      animation?.addEventListener('finish', () => {
        setPullDistance(0);
      });
    }
  }, [isPulling, isRefreshing, pullDistance]);

  const refreshIconRotation = isRefreshing ? 'animate-spin' : 
    pullDistance >= refreshThreshold ? 'rotate-180' : '';

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Индикатор обновления */}
      <div 
        className="absolute top-0 left-0 right-0 flex items-center justify-center bg-background/80 backdrop-blur-sm border-b transition-all duration-300"
        style={{
          height: `${Math.max(0, pullDistance)}px`,
          opacity: pullDistance > 20 ? 1 : pullDistance / 20,
        }}
      >
        <div className={cn(
          'flex items-center gap-2 text-sm text-muted-foreground transition-all duration-300',
          refreshIconRotation
        )}>
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          <span>
            {isRefreshing ? 'Обновление...' : 
             pullDistance >= refreshThreshold ? 'Отпустите для обновления' : 
             'Потяните для обновления'}
          </span>
        </div>
      </div>

      {/* Контент */}
      <div
        ref={containerRef}
        className="transition-transform duration-300 ease-out"
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * 👆 Swipe Actions компонент
 */
interface SwipeAction {
  id: string;
  label: string;
  icon: ReactNode;
  color: 'primary' | 'secondary' | 'destructive' | 'success' | 'warning';
  onAction: () => void;
}

interface SwipeActionsProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

export const SwipeActions: React.FC<SwipeActionsProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  threshold = 80,
  className,
  disabled = false,
}) => {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isSwipingLeft, setIsSwipingLeft] = useState(false);
  const [isSwipingRight, setIsSwipingRight] = useState(false);
  const [startX, setStartX] = useState(0);
  const [activeAction, setActiveAction] = useState<SwipeAction | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const triggerHaptic = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30],
      };
      navigator.vibrate(patterns[type]);
    }
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return;
    setStartX(e.touches[0].clientX);
  }, [disabled]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled) return;

    const currentX = e.touches[0].clientX;
    const distance = currentX - startX;
    const absDistance = Math.abs(distance);

    if (absDistance > 10) {
      e.preventDefault();
      setSwipeDistance(distance);
      
      if (distance > 0 && leftActions.length > 0) {
        setIsSwipingRight(true);
        setIsSwipingLeft(false);
        
        // Определяем активное действие
        const actionIndex = Math.min(
          Math.floor(distance / threshold),
          leftActions.length - 1
        );
        const newActiveAction = leftActions[actionIndex];
        
        if (newActiveAction !== activeAction) {
          setActiveAction(newActiveAction);
          triggerHaptic('light');
        }
      } else if (distance < 0 && rightActions.length > 0) {
        setIsSwipingLeft(true);
        setIsSwipingRight(false);
        
        const actionIndex = Math.min(
          Math.floor(Math.abs(distance) / threshold),
          rightActions.length - 1
        );
        const newActiveAction = rightActions[actionIndex];
        
        if (newActiveAction !== activeAction) {
          setActiveAction(newActiveAction);
          triggerHaptic('light');
        }
      }
    }
  }, [disabled, startX, leftActions, rightActions, threshold, activeAction, triggerHaptic]);

  const handleTouchEnd = useCallback(() => {
    if (disabled) return;

    const absDistance = Math.abs(swipeDistance);
    
    if (absDistance >= threshold && activeAction) {
      triggerHaptic('heavy');
      activeAction.onAction();
    }

    // Сброс состояния
    setSwipeDistance(0);
    setIsSwipingLeft(false);
    setIsSwipingRight(false);
    setActiveAction(null);
  }, [disabled, swipeDistance, threshold, activeAction, triggerHaptic]);

  const getActionColor = (color: SwipeAction['color']) => {
    const colors = {
      primary: 'bg-primary text-primary-foreground',
      secondary: 'bg-secondary text-secondary-foreground',
      destructive: 'bg-destructive text-destructive-foreground',
      success: 'bg-green-500 text-white',
      warning: 'bg-yellow-500 text-white',
    };
    return colors[color];
  };

  return (
    <div className={cn('relative overflow-hidden', className)}>
      {/* Левые действия */}
      {leftActions.length > 0 && (
        <div 
          className="absolute left-0 top-0 bottom-0 flex items-center"
          style={{
            width: `${Math.max(0, swipeDistance)}px`,
            opacity: isSwipingRight ? 1 : 0,
          }}
        >
          {leftActions.map((action) => (
            <div
              key={action.id}
              className={cn(
                'flex items-center justify-center h-full px-4 transition-all duration-200',
                getActionColor(action.color),
                activeAction?.id === action.id ? 'scale-110' : 'scale-100'
              )}
              style={{ width: `${threshold}px` }}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs font-medium">{action.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Правые действия */}
      {rightActions.length > 0 && (
        <div 
          className="absolute right-0 top-0 bottom-0 flex items-center"
          style={{
            width: `${Math.max(0, Math.abs(swipeDistance))}px`,
            opacity: isSwipingLeft ? 1 : 0,
          }}
        >
          {rightActions.map((action) => (
            <div
              key={action.id}
              className={cn(
                'flex items-center justify-center h-full px-4 transition-all duration-200',
                getActionColor(action.color),
                activeAction?.id === action.id ? 'scale-110' : 'scale-100'
              )}
              style={{ width: `${threshold}px` }}
            >
              <div className="flex flex-col items-center gap-1">
                {action.icon}
                <span className="text-xs font-medium">{action.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Основной контент */}
      <div
        ref={containerRef}
        className="relative z-10 bg-background transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${swipeDistance}px)`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
};

/**
 * 📳 Haptic Feedback хук
 */
export const useHapticFeedback = () => {
  const isSupported = 'vibrate' in navigator;

  const trigger = useCallback((
    pattern: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | number[]
  ) => {
    if (!isSupported) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      error: [50, 50, 50],
      warning: [20, 20, 20],
    };

    const vibrationPattern = Array.isArray(pattern) ? pattern : patterns[pattern];
    navigator.vibrate(vibrationPattern);
  }, [isSupported]);

  return {
    isSupported,
    trigger,
  };
};

/**
 * 🎯 Long Press компонент
 */
interface LongPressProps {
  children: ReactNode;
  onLongPress: () => void;
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export const LongPress: React.FC<LongPressProps> = ({
  children,
  onLongPress,
  delay = 500,
  className,
  disabled = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { trigger } = useHapticFeedback();

  const handleStart = useCallback(() => {
    if (disabled) return;

    setIsPressed(true);
    trigger('light');

    timeoutRef.current = setTimeout(() => {
      trigger('heavy');
      onLongPress();
      setIsPressed(false);
    }, delay);
  }, [disabled, delay, onLongPress, trigger]);

  const handleEnd = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPressed(false);
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      className={cn(
        'transition-all duration-200',
        isPressed ? 'scale-95 opacity-80' : 'scale-100 opacity-100',
        className
      )}
      onTouchStart={handleStart}
      onTouchEnd={handleEnd}
      onTouchCancel={handleEnd}
      onMouseDown={handleStart}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
    >
      {children}
    </div>
  );
};

/**
 * 🌊 Ripple Effect компонент
 */
interface RippleEffectProps {
  children: ReactNode;
  color?: string;
  duration?: number;
  className?: string;
  disabled?: boolean;
}

export const RippleEffect: React.FC<RippleEffectProps> = ({
  children,
  color = 'rgba(255, 255, 255, 0.3)',
  duration = 600,
  className,
  disabled = false,
}) => {
  const [ripples, setRipples] = useState<Array<{
    id: number;
    x: number;
    y: number;
    size: number;
  }>>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const createRipple = useCallback((e: MouseEvent | TouchEvent) => {
    if (disabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 2;

    const newRipple = {
      id: Date.now(),
      x: x - size / 2,
      y: y - size / 2,
      size,
    };

    setRipples(prev => [...prev, newRipple]);

    // Удаляем рипл после анимации
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, duration);
  }, [disabled, duration]);

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      onMouseDown={createRipple}
      onTouchStart={createRipple}
    >
      {children}
      
      {/* Рипл эффекты */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full pointer-events-none animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: ripple.size,
            height: ripple.size,
            backgroundColor: color,
            animationDuration: `${duration}ms`,
          }}
        />
      ))}
    </div>
  );
};

/**
 * 📱 Bottom Sheet компонент
 */
interface BottomSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: number[];
  initialSnap?: number;
  className?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  children,
  isOpen,
  onClose,
  snapPoints = [0.3, 0.6, 0.9],
  initialSnap = 0,
  className,
}) => {
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [currentY, setCurrentY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { trigger } = useHapticFeedback();

  const snapHeight = snapPoints[currentSnap] * window.innerHeight;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    setStartY(e.touches[0].clientY);
    setCurrentY(e.touches[0].clientY);
    setIsDragging(true);
    trigger('light');
  }, [trigger]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    
    const newY = e.touches[0].clientY;
    setCurrentY(newY);
    
    const deltaY = newY - startY;
    const newHeight = Math.max(0, snapHeight - deltaY);
    
    if (sheetRef.current) {
      sheetRef.current.style.height = `${newHeight}px`;
    }
  }, [isDragging, startY, snapHeight]);

  const handleTouchEnd = useCallback(() => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    const deltaY = currentY - startY;
    const threshold = 50;
    
    if (deltaY > threshold && currentSnap > 0) {
      // Свайп вниз - уменьшаем высоту
      setCurrentSnap(prev => Math.max(0, prev - 1));
      trigger('medium');
    } else if (deltaY < -threshold && currentSnap < snapPoints.length - 1) {
      // Свайп вверх - увеличиваем высоту
      setCurrentSnap(prev => Math.min(snapPoints.length - 1, prev + 1));
      trigger('medium');
    } else if (deltaY > threshold * 2) {
      // Закрываем при сильном свайпе вниз
      onClose();
      trigger('heavy');
    }
    
    // Возвращаем к ближайшей точке привязки
    if (sheetRef.current) {
      sheetRef.current.style.height = `${snapPoints[currentSnap] * window.innerHeight}px`;
    }
  }, [isDragging, currentY, startY, currentSnap, snapPoints, onClose, trigger]);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={cn(
          'fixed bottom-0 left-0 right-0 bg-background rounded-t-3xl shadow-2xl z-50 transition-all duration-300 ease-out',
          className
        )}
        style={{
          height: `${snapHeight}px`,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center py-3">
          <div className="w-12 h-1 bg-muted-foreground/30 rounded-full" />
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-auto px-4 pb-safe">
          {children}
        </div>
      </div>
    </>
  );
};

export default {
  PullToRefresh,
  SwipeActions,
  useHapticFeedback,
  LongPress,
  RippleEffect,
  BottomSheet,
};