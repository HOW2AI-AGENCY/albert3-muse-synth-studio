import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'centered' | 'sidebar' | 'full-width';
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  className = '',
  variant = 'default',
  maxWidth = 'xl'
}) => {
  const getMaxWidthClass = () => {
    switch (maxWidth) {
      case 'sm': return 'max-w-sm';
      case 'md': return 'max-w-md';
      case 'lg': return 'max-w-lg';
      case 'xl': return 'max-w-xl';
      case '2xl': return 'max-w-2xl';
      case 'full': return 'max-w-full';
      default: return 'max-w-xl';
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'centered':
        return 'mx-auto px-4 sm:px-6 lg:px-8';
      case 'sidebar':
        return 'flex flex-col lg:flex-row gap-6 px-4 sm:px-6 lg:px-8';
      case 'full-width':
        return 'w-full px-4 sm:px-6 lg:px-8';
      default:
        return 'container mx-auto px-4 sm:px-6 lg:px-8';
    }
  };

  return (
    <div className={cn(
      getVariantClasses(),
      getMaxWidthClass(),
      className
    )}>
      {children}
    </div>
  );
};

// Компонент для адаптивной сетки
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    default?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  cols = { default: 1, md: 2, lg: 3 },
  gap = 'md'
}) => {
  const getGridClasses = () => {
    const classes = ['grid'];
    
    // Добавляем классы для колонок
    if (cols.default) classes.push(`grid-cols-${cols.default}`);
    if (cols.sm) classes.push(`sm:grid-cols-${cols.sm}`);
    if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
    if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
    if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
    
    // Добавляем gap
    switch (gap) {
      case 'sm': classes.push('gap-2'); break;
      case 'md': classes.push('gap-4'); break;
      case 'lg': classes.push('gap-6'); break;
      case 'xl': classes.push('gap-8'); break;
    }
    
    return classes.join(' ');
  };

  return (
    <div className={cn(getGridClasses(), className)}>
      {children}
    </div>
  );
};

// Компонент для адаптивного стека
interface ResponsiveStackProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'vertical' | 'horizontal' | 'responsive';
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

export const ResponsiveStack: React.FC<ResponsiveStackProps> = ({
  children,
  className = '',
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start'
}) => {
  const getDirectionClasses = () => {
    switch (direction) {
      case 'horizontal':
        return 'flex flex-row';
      case 'responsive':
        return 'flex flex-col md:flex-row';
      default:
        return 'flex flex-col';
    }
  };

  const getSpacingClasses = () => {
    const isHorizontal = direction === 'horizontal' || direction === 'responsive';
    const baseSpacing = isHorizontal ? 'space-x-' : 'space-y-';
    const responsiveSpacing = direction === 'responsive' ? 'space-y- md:space-y-0 md:space-x-' : '';
    
    switch (spacing) {
      case 'sm': 
        return responsiveSpacing ? `space-y-2 md:space-y-0 md:space-x-2` : `${baseSpacing}2`;
      case 'md': 
        return responsiveSpacing ? `space-y-4 md:space-y-0 md:space-x-4` : `${baseSpacing}4`;
      case 'lg': 
        return responsiveSpacing ? `space-y-6 md:space-y-0 md:space-x-6` : `${baseSpacing}6`;
      case 'xl': 
        return responsiveSpacing ? `space-y-8 md:space-y-0 md:space-x-8` : `${baseSpacing}8`;
      default: 
        return responsiveSpacing ? `space-y-4 md:space-y-0 md:space-x-4` : `${baseSpacing}4`;
    }
  };

  const getAlignClasses = () => {
    switch (align) {
      case 'start': return 'items-start';
      case 'center': return 'items-center';
      case 'end': return 'items-end';
      case 'stretch': return 'items-stretch';
      default: return 'items-stretch';
    }
  };

  const getJustifyClasses = () => {
    switch (justify) {
      case 'start': return 'justify-start';
      case 'center': return 'justify-center';
      case 'end': return 'justify-end';
      case 'between': return 'justify-between';
      case 'around': return 'justify-around';
      case 'evenly': return 'justify-evenly';
      default: return 'justify-start';
    }
  };

  return (
    <div className={cn(
      getDirectionClasses(),
      getSpacingClasses(),
      getAlignClasses(),
      getJustifyClasses(),
      className
    )}>
      {children}
    </div>
  );
};

export default ResponsiveLayout;