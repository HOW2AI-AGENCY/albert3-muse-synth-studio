import React, { useMemo } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { fadeInVariants, slideUpVariants, scaleInVariants, staggerItemVariants } from './variants';

/**
 * Оптимизированные пресеты анимаций перенесены в './variants.ts'
 * Файл компонента экспортирует только React-компоненты для соблюдения react-refresh правил.
 */

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
