/**
 * Mobile Breadcrumbs Component
 * Compact breadcrumb navigation optimized for mobile devices
 * Phase 3 improvement from 2025-11-05 audit
 */

import { memo } from 'react';
import { ChevronRight, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { hapticFeedback } from '@/utils/haptic';

/**
 * Breadcrumb item
 */
import type { BreadcrumbItem } from './breadcrumbs.types';

/**
 * Mobile breadcrumbs props
 */
interface MobileBreadcrumbsProps {
  /**
   * Breadcrumb items
   */
  items: BreadcrumbItem[];

  /**
   * Show home icon
   */
  showHomeIcon?: boolean;

  /**
   * Maximum items to show before collapsing
   * Shows first item, ellipsis, last 2 items
   */
  maxItems?: number;

  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Mobile breadcrumbs component
 * Provides compact navigation path for mobile screens
 *
 * @example
 * ```tsx
 * <MobileBreadcrumbs
 *   items={[
 *     { label: 'Projects', href: '/projects' },
 *     { label: 'My Album', href: '/projects/123' },
 *     { label: 'Track Details', current: true }
 *   ]}
 * />
 * ```
 */
export const MobileBreadcrumbs = memo<MobileBreadcrumbsProps>(({
  items,
  showHomeIcon = true,
  maxItems = 3,
  className,
}) => {
  // Don't render if no items
  if (items.length === 0) {
    return null;
  }

  /**
   * Handle breadcrumb click with haptic feedback
   */
  const handleClick = () => {
    hapticFeedback.navigation();
  };

  /**
   * Determine which items to show
   * If more than maxItems, show first item, ellipsis, and last (maxItems - 1) items
   */
  const displayItems = items.length > maxItems
    ? [
        items[0],
        { label: '...', ellipsis: true } as BreadcrumbItem & { ellipsis: boolean },
        ...items.slice(-(maxItems - 1))
      ]
    : items;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "flex items-center gap-1 overflow-x-auto scrollbar-hide py-2 px-3 sm:px-4",
        "mobile-text-sm text-muted-foreground",
        className
      )}
    >
      <ol className="flex items-center gap-1 whitespace-nowrap">
        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = 'ellipsis' in item && item.ellipsis;

          if (isEllipsis) {
            return (
              <li key={`ellipsis-${index}`} className="flex items-center gap-1">
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-muted-foreground/60">...</span>
              </li>
            );
          }

          const Icon = item.icon || (index === 0 && showHomeIcon ? Home : undefined);

          return (
            <li key={item.href || item.label} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
              )}

              {item.current || isLast || !item.href ? (
                // Current page - not a link
                <span
                  className={cn(
                    "flex items-center gap-1.5 font-medium",
                    "text-foreground truncate max-w-[200px] sm:max-w-none"
                  )}
                  aria-current={item.current ? 'page' : undefined}
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </span>
              ) : (
                // Link to previous page
                <Link
                  to={item.href}
                  onClick={handleClick}
                  className={cn(
                    "flex items-center gap-1.5",
                    "hover:text-foreground transition-colors",
                    "truncate max-w-[150px] sm:max-w-[200px]",
                    "active:opacity-70" // Touch feedback
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 flex-shrink-0" />}
                  <span className="truncate">{item.label}</span>
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

MobileBreadcrumbs.displayName = 'MobileBreadcrumbs';

/**
 * Hook to generate breadcrumbs from route path
 * @param pathname - Current route pathname
 * @param customLabels - Custom labels for route segments
 * @returns Breadcrumb items
 *
 * @example
 * ```tsx
 * const breadcrumbs = useBreadcrumbs('/workspace/projects/123', {
 *   workspace: 'Workspace',
 *   projects: 'Projects',
 *   '123': 'My Album'
 * });
 * ```
 */
// Перенесено в './useBreadcrumbs'

/**
 * Utility to create breadcrumb item
 */
// Перенесено в './breadcrumbUtils'
