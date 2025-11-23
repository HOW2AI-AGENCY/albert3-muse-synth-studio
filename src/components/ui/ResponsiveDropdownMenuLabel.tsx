
import React from 'react';
import { DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { useResponsiveMenuContext } from './responsive-dropdown-menu';
import { cn } from '@/lib/utils';

interface ResponsiveDropdownMenuLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveDropdownMenuLabel: React.FC<ResponsiveDropdownMenuLabelProps> = ({
  children,
  className,
  ...props
}) => {
  const { isMobile } = useResponsiveMenuContext();

  if (isMobile) {
    // На мобильных устройствах рендерим простой div со стилями,
    // имитирующими заголовок группы
    return (
      <div
        className={cn('px-2 py-1.5 text-xs font-semibold text-muted-foreground', className)}
        {...props}
      >
        {children}
      </div>
    );
  }

  // На десктопе используем стандартный DropdownMenuLabel
  return (
    <DropdownMenuLabel className={cn("text-xs text-muted-foreground", className)} {...props}>
      {children}
    </DropdownMenuLabel>
  );
};
