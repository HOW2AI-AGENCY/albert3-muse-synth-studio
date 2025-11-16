/**
 * ResponsiveGrid Component
 * Phase 5: Adaptive Components
 * 
 * Автоматическая адаптивная сетка с container queries
 */

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Минимальный размер элемента (используется в auto-fit) */
  minItemSize?: number;
  /** Максимальное количество колонок */
  maxColumns?: number;
  /** Фиксированное количество колонок (отключает auto-fit) */
  columns?: number;
  /** Режим gap */
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  /** Режим адаптации */
  adaptive?: boolean;
}

/**
 * Адаптивная сетка с auto-fit и container queries
 * 
 * Использует CSS Grid с auto-fit для автоматической адаптации
 * количества колонок на основе доступного пространства
 * 
 * @example
 * ```tsx
 * <ResponsiveGrid minItemSize={250} maxColumns={4} gap="lg">
 *   <TrackCard />
 *   <TrackCard />
 *   <TrackCard />
 * </ResponsiveGrid>
 * ```
 */
export const ResponsiveGrid = forwardRef<HTMLDivElement, ResponsiveGridProps>(
  (
    {
      className,
      minItemSize = 250,
      maxColumns = 4,
      columns,
      gap = 'md',
      adaptive = true,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const gapClasses = {
      none: 'gap-0',
      sm: 'gap-2',
      md: 'gap-4',
      lg: 'gap-6',
      xl: 'gap-8',
    };

    // Если указано фиксированное количество колонок
    const gridTemplateColumns = columns
      ? `repeat(${columns}, minmax(0, 1fr))`
      : adaptive
        ? `repeat(auto-fit, minmax(min(${minItemSize}px, 100%), 1fr))`
        : `repeat(auto-fill, minmax(${minItemSize}px, 1fr))`;

    return (
      <div
        ref={ref}
        className={cn(
          'grid container-inline',
          gapClasses[gap],
          // Responsive columns через container queries
          adaptive && [
            'cq-xs:grid-cols-1',
            'cq-sm:grid-cols-2',
            maxColumns >= 3 && 'cq-md:grid-cols-3',
            maxColumns >= 4 && 'cq-lg:grid-cols-4',
          ],
          className
        )}
        style={{
          ...style,
          gridTemplateColumns: !adaptive ? gridTemplateColumns : undefined,
        }}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ResponsiveGrid.displayName = 'ResponsiveGrid';

/**
 * Responsive Masonry Grid
 * Сетка с переменной высотой элементов
 */
interface ResponsiveMasonryProps extends React.HTMLAttributes<HTMLDivElement> {
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveMasonry = forwardRef<HTMLDivElement, ResponsiveMasonryProps>(
  ({ className, columns = { xs: 1, sm: 2, md: 3, lg: 4 }, gap = 'md', children, ...props }, ref) => {
    const gapValue = {
      none: '0',
      sm: '0.5rem',
      md: '1rem',
      lg: '1.5rem',
      xl: '2rem',
    }[gap];

    return (
      <div
        ref={ref}
        className={cn('container-inline', className)}
        style={{
          columnCount: columns.lg || 4,
          columnGap: gapValue,
        }}
        {...props}
      >
        <style>{`
          @container (max-width: 480px) {
            .container-inline {
              column-count: ${columns.xs || 1};
            }
          }
          @container (min-width: 481px) and (max-width: 768px) {
            .container-inline {
              column-count: ${columns.sm || 2};
            }
          }
          @container (min-width: 769px) and (max-width: 1024px) {
            .container-inline {
              column-count: ${columns.md || 3};
            }
          }
        `}</style>
        {children}
      </div>
    );
  }
);

ResponsiveMasonry.displayName = 'ResponsiveMasonry';
