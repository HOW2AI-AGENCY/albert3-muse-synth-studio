/**
 * AdaptiveCard Component
 * Phase 5: Adaptive Components
 * 
 * Карточка, которая автоматически адаптируется к размеру контейнера
 */

import { forwardRef, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useContainerQuery } from '@/hooks/useResponsive';
import { Card } from '@/components/ui/card';

interface AdaptiveCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Компактный режим для маленьких контейнеров */
  compact?: boolean;
  /** Вертикальная ориентация для узких контейнеров */
  vertical?: boolean;
  /** Автоматическая адаптация на основе размера контейнера */
  autoAdapt?: boolean;
}

/**
 * Адаптивная карточка с container queries
 * 
 * Автоматически меняет layout на основе размера контейнера:
 * - < 320px: Вертикальный, ультра-компактный
 * - 320-480px: Вертикальный, компактный
 * - 480-640px: Горизонтальный, компактный
 * - > 640px: Горизонтальный, полный размер
 */
export const AdaptiveCard = forwardRef<HTMLDivElement, AdaptiveCardProps>(
  ({ className, compact = false, vertical = false, autoAdapt = true, children, ...props }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const size = useContainerQuery(containerRef);

    // Определяем layout на основе размера контейнера
    const isVertical = autoAdapt ? size.width < 480 : vertical;
    const isCompact = autoAdapt ? size.width < 640 : compact;
    const isUltraCompact = autoAdapt && size.width < 320;

    return (
      <Card
        ref={(node) => {
          // Поддержка multiple refs
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
          (containerRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
        }}
        className={cn(
          'container-inline transition-all duration-300',
          'hover:shadow-lg hover:scale-[1.02]',
          isVertical && 'flex-col',
          !isVertical && 'flex-row',
          isCompact && 'gap-2 p-3',
          !isCompact && 'gap-4 p-4',
          isUltraCompact && 'gap-1 p-2',
          className
        )}
        {...props}
      >
        {children}
      </Card>
    );
  }
);

AdaptiveCard.displayName = 'AdaptiveCard';

/**
 * Content wrapper для адаптивной карточки
 */
interface AdaptiveCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Приоритет элемента (высокий приоритет остается видимым дольше) */
  priority?: 'high' | 'medium' | 'low';
}

export const AdaptiveCardContent = forwardRef<HTMLDivElement, AdaptiveCardContentProps>(
  ({ className, priority = 'medium', children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'adaptive-content transition-all duration-300',
          // Container queries для скрытия контента при маленьких размерах
          priority === 'low' && 'cq-xs:hidden',
          priority === 'medium' && 'cq-xs:hidden cq-sm:block',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

AdaptiveCardContent.displayName = 'AdaptiveCardContent';

/**
 * Image wrapper для адаптивной карточки
 */
interface AdaptiveCardImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  aspectRatio?: 'square' | 'video' | 'portrait';
}

export const AdaptiveCardImage = forwardRef<HTMLImageElement, AdaptiveCardImageProps>(
  ({ className, aspectRatio = 'square', alt, ...props }, ref) => {
    const aspectRatioClass = {
      square: 'aspect-square',
      video: 'aspect-video',
      portrait: 'aspect-[3/4]',
    }[aspectRatio];

    return (
      <div className={cn('relative overflow-hidden rounded-md', aspectRatioClass)}>
        <img
          ref={ref}
          alt={alt}
          className={cn(
            'w-full h-full object-cover',
            'transition-transform duration-300',
            'group-hover:scale-110',
            className
          )}
          loading="lazy"
          {...props}
        />
      </div>
    );
  }
);

AdaptiveCardImage.displayName = 'AdaptiveCardImage';
