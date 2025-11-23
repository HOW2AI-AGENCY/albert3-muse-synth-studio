import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from '@/components/ui/drawer';
import React, { createContext, useContext } from 'react';

// 1. Создаем контекст для передачи информации о мобильном режиме
// Этот контекст позволит дочерним компонентам (как MenuItem, Separator)
// знать, как им следует рендериться - как часть Drawer или Dropdown.
const ResponsiveMenuContext = createContext<{ isMobile: boolean }>({
  isMobile: false,
});

// 2. Создаем кастомный хук для удобного доступа к контексту
export const useResponsiveMenuContext = () => useContext(ResponsiveMenuContext);

interface ResponsiveDropdownMenuProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
}

export const ResponsiveDropdownMenu = ({ trigger, children }: ResponsiveDropdownMenuProps) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = React.useState(false);

  // 3. Оборачиваем дочерние элементы в провайдер контекста,
  // передавая текущее значение isMobile.
  const content = (
    <ResponsiveMenuContext.Provider value={{ isMobile }}>
      {children}
    </ResponsiveMenuContext.Provider>
  );

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent>
          {/* Для мобильной версии добавляем отступы прямо в контент */}
          <div className="p-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {/* Для десктопной версии рендерим контент без изменений */}
        {content}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
