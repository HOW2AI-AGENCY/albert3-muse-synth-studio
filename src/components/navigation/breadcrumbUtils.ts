import type { BreadcrumbItem } from './breadcrumbs.types';

/**
 * Утилита для создания элемента хлебных крошек
 */
export const createBreadcrumb = (
  label: string,
  href?: string,
  icon?: React.ComponentType<{ className?: string }>
): BreadcrumbItem => ({
  label,
  href,
  icon,
  current: !href,
});