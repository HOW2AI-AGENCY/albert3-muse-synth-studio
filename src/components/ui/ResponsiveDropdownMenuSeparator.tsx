
import React from 'react';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useResponsiveMenuContext } from './responsive-dropdown-menu';

export const ResponsiveDropdownMenuSeparator: React.FC = () => {
  const { isMobile } = useResponsiveMenuContext();

  if (isMobile) {
    // На мобильных устройствах рендерим простой горизонтальный разделитель
    return <hr className="my-2 border-border" />;
  }

  // На десктопе используем стандартный сепаратор из dropdown-menu
  return <DropdownMenuSeparator />;
};
