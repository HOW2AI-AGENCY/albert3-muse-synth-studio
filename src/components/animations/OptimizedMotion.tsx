import React, { useMemo } from 'react';
import { motion, MotionProps, Variants } from 'framer-motion';

/**
 * Оптимизированные пресеты анимаций для повторного использования
 * Используют GPU-ускоренные свойства (transform, opacity)
 */

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.2 }
  }
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

export const scaleInVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.2 }
  }
};

export const staggerContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1
    }
  }
};

export const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.2 }
  }
};

interface OptimizedMotionProps extends MotionProps {
  children: React.ReactNode;
  variant?: 'fadeIn' | 'slideUp' | 'scaleIn';
  className?: string;
}

/**
 * Оптимизированный motion компонент с предустановленными анимациями
 * Автоматически применяет will-change для GPU acceleration
 */
export const OptimizedMotion = React.memo(({ 
  children, 
  variant = 'fadeIn',
  className,
  ...motionProps 
}: OptimizedMotionProps) => {
  const variants = useMemo(() => {
    switch (variant) {
      case 'fadeIn':
        return fadeInVariants;
      case 'slideUp':
        return slideUpVariants;
      case 'scaleIn':
        return scaleInVariants;
      default:
        return fadeInVariants;
    }
  }, [variant]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
      style={{ willChange: 'transform, opacity' }}
      {...motionProps}
    >
      {children}
    </motion.div>
  );
});

OptimizedMotion.displayName = 'OptimizedMotion';

interface StaggerContainerProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
}

/**
 * Контейнер для stagger анимаций с оптимизацией
 */
export const StaggerContainer = React.memo(({ 
  children, 
  className,
  staggerDelay = 0.05 
}: StaggerContainerProps) => {
  const variants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: 0.1
      }
    }
  }), [staggerDelay]);

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      className={className}
    >
      {children}
    </motion.div>
  );
});

StaggerContainer.displayName = 'StaggerContainer';

/**
 * Оптимизированный item для stagger анимаций
 */
export const StaggerItem = React.memo(({ 
  children, 
  className 
}: { 
  children: React.ReactNode; 
  className?: string;
}) => {
  return (
    <motion.div
      variants={staggerItemVariants}
      className={className}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
});

StaggerItem.displayName = 'StaggerItem';
