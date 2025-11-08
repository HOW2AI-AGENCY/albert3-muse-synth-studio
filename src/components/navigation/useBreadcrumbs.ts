import type { BreadcrumbItem } from './breadcrumbs.types';

/**
 * Хук для генерации хлебных крошек из пути
 */
export const useBreadcrumbs = (
  pathname: string,
  customLabels?: Record<string, string>
): BreadcrumbItem[] => {
  const segments = pathname.split('/').filter(Boolean);

  return segments.map((segment, index) => {
    const href = '/' + segments.slice(0, index + 1).join('/');
    const isLast = index === segments.length - 1;

    const label = customLabels?.[segment]
      || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' ');

    return {
      label,
      href: isLast ? undefined : href,
      current: isLast,
    };
  });
};