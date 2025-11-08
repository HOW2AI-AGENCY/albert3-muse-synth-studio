/**
 * Тип элемента хлебных крошек
 */
export interface BreadcrumbItem {
  /** Отображаемый текст */
  label: string;
  /** Путь навигации (необязательно для текущей страницы) */
  href?: string;
  /** Иконка (необязательно) */
  icon?: React.ComponentType<{ className?: string }>;
  /** Признак текущей страницы */
  current?: boolean;
}