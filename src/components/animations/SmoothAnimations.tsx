import React, { 
  useState, 
  useEffect, 
  useRef, 
  ReactNode, 
  
  useCallback
} from 'react';
import { cn } from '@/lib/utils';

/**
 * 🎬 Типы анимаций и их параметры
 */
export type AnimationType = 
  | 'fadeIn' 
  | 'fadeOut' 
  | 'slideUp' 
  | 'slideDown' 
  | 'slideLeft' 
  | 'slideRight'
  | 'scaleIn' 
  | 'scaleOut'
  | 'bounceIn'
  | 'elastic'
  | 'materialSlide'
  | 'materialFade';

export type EasingFunction = 
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'materialStandard'
  | 'materialDecelerate'
  | 'materialAccelerate'
  | 'materialSharp';

interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: EasingFunction;
  fillMode?: 'forwards' | 'backwards' | 'both' | 'none';
  iterations?: number | 'infinite';
}

/**
 * 🎯 Material Design Easing Functions
 */
const easingFunctions = {
  linear: 'linear',
  easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
  easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  materialStandard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  materialDecelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
  materialAccelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
  materialSharp: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
};

/**
 * 🎨 SmoothAnimation - Компонент для плавных анимаций
 */
interface SmoothAnimationProps {
  children: ReactNode;
  type: AnimationType;
  config?: AnimationConfig;
  trigger?: boolean;
  className?: string;
  onComplete?: () => void;
  onStart?: () => void;
}

export const SmoothAnimation: React.FC<SmoothAnimationProps> = ({
  children,
  type,
  config = {},
  trigger = true,
  className,
  onComplete,
  onStart,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isVisible, setIsVisible] = useState(type.includes('In') ? false : true);
  const elementRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<Animation | null>(null);

  const {
    duration = 300,
    delay = 0,
    easing = 'materialStandard',
    fillMode = 'forwards',
    iterations = 1,
  } = config;

  // Определение keyframes для разных типов анимаций
  const getKeyframes = useCallback((animationType: AnimationType): Keyframe[] => {
    switch (animationType) {
      case 'fadeIn':
        return [
          { opacity: 0 },
          { opacity: 1 }
        ];
      
      case 'fadeOut':
        return [
          { opacity: 1 },
          { opacity: 0 }
        ];
      
      case 'slideUp':
        return [
          { transform: 'translateY(100%)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 }
        ];
      
      case 'slideDown':
        return [
          { transform: 'translateY(-100%)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 }
        ];
      
      case 'slideLeft':
        return [
          { transform: 'translateX(100%)', opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 }
        ];
      
      case 'slideRight':
        return [
          { transform: 'translateX(-100%)', opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 }
        ];
      
      case 'scaleIn':
        return [
          { transform: 'scale(0.8)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 }
        ];
      
      case 'scaleOut':
        return [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.8)', opacity: 0 }
        ];
      
      case 'bounceIn':
        return [
          { transform: 'scale(0.3)', opacity: 0 },
          { transform: 'scale(1.05)', opacity: 0.7, offset: 0.5 },
          { transform: 'scale(0.9)', opacity: 0.9, offset: 0.75 },
          { transform: 'scale(1)', opacity: 1 }
        ];
      
      case 'elastic':
        return [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(1.25)', opacity: 1, offset: 0.25 },
          { transform: 'scale(0.75)', opacity: 1, offset: 0.5 },
          { transform: 'scale(1.15)', opacity: 1, offset: 0.75 },
          { transform: 'scale(1)', opacity: 1 }
        ];
      
      case 'materialSlide':
        return [
          { transform: 'translateY(56px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 }
        ];
      
      case 'materialFade':
        return [
          { opacity: 0, transform: 'scale(0.8)' },
          { opacity: 1, transform: 'scale(1)' }
        ];
      
      default:
        return [
          { opacity: 0 },
          { opacity: 1 }
        ];
    }
  }, []);

  // Запуск анимации
  const startAnimation = useCallback(() => {
    if (!elementRef.current || isAnimating) return;

    setIsAnimating(true);
    onStart?.();

    // Показываем элемент перед анимацией входа
    if (type.includes('In')) {
      setIsVisible(true);
    }

    const keyframes = getKeyframes(type);
    
    // Создаем анимацию с Web Animations API для лучшей производительности
    animationRef.current = elementRef.current.animate(keyframes, {
      duration,
      delay,
      easing: easingFunctions[easing],
      fill: fillMode,
      iterations: iterations === 'infinite' ? Infinity : iterations,
    });

    // Обработка завершения анимации
    animationRef.current.addEventListener('finish', () => {
      setIsAnimating(false);
      
      // Скрываем элемент после анимации выхода
      if (type.includes('Out')) {
        setIsVisible(false);
      }
      
      onComplete?.();
    });

  }, [type, duration, delay, easing, fillMode, iterations, isAnimating, onStart, onComplete, getKeyframes]);

  // Остановка анимации
  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel();
      setIsAnimating(false);
    }
  }, []);

  // Запуск анимации при изменении trigger
  useEffect(() => {
    if (trigger) {
      startAnimation();
    } else {
      stopAnimation();
    }
  }, [trigger, startAnimation, stopAnimation]);

  // Очистка при размонтировании
  useEffect(() => {
    return () => {
      stopAnimation();
    };
  }, [stopAnimation]);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={elementRef}
      className={cn('will-change-transform', className)}
      style={{
        backfaceVisibility: 'hidden',
        perspective: '1000px',
      }}
    >
      {children}
    </div>
  );
};

/**
 * 🔄 AnimatedTransition - Компонент для переходов между состояниями
 */
interface AnimatedTransitionProps {
  children: ReactNode;
  show: boolean;
  enter?: AnimationType;
  exit?: AnimationType;
  config?: AnimationConfig;
  className?: string;
  onEnterComplete?: () => void;
  onExitComplete?: () => void;
}

export const AnimatedTransition: React.FC<AnimatedTransitionProps> = ({
  children,
  show,
  enter = 'fadeIn',
  exit = 'fadeOut',
  config,
  className,
  onEnterComplete,
  onExitComplete,
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>(enter);

  useEffect(() => {
    if (show && !isVisible) {
      setIsVisible(true);
      setCurrentAnimation(enter);
    } else if (!show && isVisible) {
      setCurrentAnimation(exit);
    }
  }, [show, isVisible, enter, exit]);

  const handleAnimationComplete = () => {
    if (currentAnimation === exit) {
      setIsVisible(false);
      onExitComplete?.();
    } else {
      onEnterComplete?.();
    }
  };

  return (
    <SmoothAnimation
      type={currentAnimation}
      trigger={isVisible}
      config={config}
      className={className}
      onComplete={handleAnimationComplete}
    >
      {children}
    </SmoothAnimation>
  );
};

/**
 * 🎪 AnimatedList - Анимированный список с поэтапным появлением элементов
 */
interface AnimatedListProps {
  children: ReactNode[];
  stagger?: number;
  animation?: AnimationType;
  config?: AnimationConfig;
  className?: string;
}

export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  stagger = 100,
  animation = 'slideUp',
  config,
  className,
}) => {
  const [visibleItems, setVisibleItems] = useState<boolean[]>(
    new Array(children.length).fill(false)
  );

  useEffect(() => {
    children.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems(prev => {
          const newState = [...prev];
          newState[index] = true;
          return newState;
        });
      }, index * stagger);
    });
  }, [children.length, stagger]);

  return (
    <div className={className}>
      {children.map((child, index) => (
        <SmoothAnimation
          key={index}
          type={animation}
          trigger={visibleItems[index]}
          config={config}
        >
          {child}
        </SmoothAnimation>
      ))}
    </div>
  );
};

/**
 * 🎭 useAnimation - Хук для управления анимациями
 */
interface UseAnimationOptions {
  duration?: number;
  easing?: EasingFunction;
  onComplete?: () => void;
}

export const useAnimation = (options: UseAnimationOptions = {}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);
  const animationRef = useRef<Animation | null>(null);

  const animate = useCallback((
    keyframes: Keyframe[],
    customOptions?: UseAnimationOptions
  ) => {
    if (!elementRef.current || isAnimating) return;

    const {
      duration = 300,
      easing = 'materialStandard',
      onComplete,
    } = { ...options, ...customOptions };

    setIsAnimating(true);

    animationRef.current = elementRef.current.animate(keyframes, {
      duration,
      easing: easingFunctions[easing],
      fill: 'forwards',
    });

    animationRef.current.addEventListener('finish', () => {
      setIsAnimating(false);
      onComplete?.();
    });
  }, [isAnimating, options]);

  const stop = useCallback(() => {
    if (animationRef.current) {
      animationRef.current.cancel();
      setIsAnimating(false);
    }
  }, []);

  return {
    elementRef,
    animate,
    stop,
    isAnimating,
  };
};

/**
 * 🎨 Предустановленные анимации для частых случаев
 */

// Анимация нажатия кнопки
export const ButtonPressAnimation: React.FC<{ children: ReactNode; className?: string }> = ({
  children,
  className,
}) => {
  const { elementRef, animate } = useAnimation();

  const handleMouseDown = () => {
    animate([
      { transform: 'scale(1)' },
      { transform: 'scale(0.95)' }
    ], { duration: 100, easing: 'materialAccelerate' });
  };

  const handleMouseUp = () => {
    animate([
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' }
    ], { duration: 200, easing: 'materialDecelerate' });
  };

  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={cn('cursor-pointer select-none', className)}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {children}
    </div>
  );
};

// Анимация загрузки
export const LoadingAnimation: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <SmoothAnimation
        type="elastic"
        config={{
          duration: 1000,
          iterations: 'infinite',
          easing: 'materialStandard',
        }}
      >
        <div className="w-8 h-8 bg-primary rounded-full" />
      </SmoothAnimation>
    </div>
  );
};

// Анимация появления карточки
export const CardRevealAnimation: React.FC<{ 
  children: ReactNode; 
  delay?: number;
  className?: string;
}> = ({ children, delay = 0, className }) => {
  return (
    <SmoothAnimation
      type="materialSlide"
      config={{
        duration: 400,
        delay,
        easing: 'materialDecelerate',
      }}
      className={className}
    >
      {children}
    </SmoothAnimation>
  );
};

// Анимация модального окна
export const ModalAnimation: React.FC<{ 
  children: ReactNode; 
  show: boolean;
  onClose?: () => void;
}> = ({ children, show, onClose }) => {
  return (
    <AnimatedTransition
      show={show}
      enter="scaleIn"
      exit="scaleOut"
      config={{
        duration: 250,
        easing: 'materialStandard',
      }}
      onExitComplete={onClose}
    >
      {children}
    </AnimatedTransition>
  );
};

export default {
  SmoothAnimation,
  AnimatedTransition,
  AnimatedList,
  useAnimation,
  ButtonPressAnimation,
  LoadingAnimation,
  CardRevealAnimation,
  ModalAnimation,
};