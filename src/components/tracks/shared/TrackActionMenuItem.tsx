import React from 'react';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import type { MenuItem } from './TrackActionsMenu.types';
import { useResponsiveMenuContext } from '@/components/ui/responsive-dropdown-menu';


interface TrackActionMenuItemProps {
  item: MenuItem;
  trackId: string;
  enableProFeatures: boolean;
}

export const TrackActionMenuItem: React.FC<TrackActionMenuItemProps> = ({
  item,
  trackId,
  enableProFeatures,
}) => {
  const { isMobile } = useResponsiveMenuContext();
  const isDisabled = item.disabled || (item.pro && !enableProFeatures);

  // Общая логика обработки клика, вынесена для переиспользования
  const handleClick = () => {
    if (!isDisabled) {
      try {
        item.action();
      } catch (error) {
        logger.error('Menu action failed', error as Error, 'TrackActionsMenu', {
          actionId: item.id,
          trackId,
        });
      }
    }
  };

  // Общий набор дочерних элементов для кнопки и пункта меню
  const children = (
    <>
      {item.icon}
      <span className="flex-1 text-left">{item.label}</span>
      {item.pro && !enableProFeatures && (
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-1">
          <Lock className="w-2.5 h-2.5" />
          Pro
        </Badge>
      )}
      {item.shortcut && !item.pro && !isMobile && (
        <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center justify-center rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
          {item.shortcut}
        </kbd>
      )}
    </>
  );

  // Классы для стилизации, общие для обоих вариантов
  const commonClassName = cn(
    'flex items-center gap-2 w-full',
    item.danger && 'text-destructive focus:text-destructive',
    isDisabled && 'opacity-50 cursor-not-allowed'
  );

  // На мобильных устройствах рендерим кнопку
  if (isMobile) {
    return (
      <Button
        variant="ghost"
        key={item.id}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(commonClassName, 'justify-start px-2 py-1.5 h-auto text-sm')}
      >
        {children}
      </Button>
    );
  }

  // Если требуется подтверждение, оборачиваем триггер в диалог
  if (item.confirmation) {
    const trigger = isMobile ? (
      <Button
        variant="ghost"
        disabled={isDisabled}
        className={cn(commonClassName, 'justify-start px-2 py-1.5 h-auto text-sm')}
      >
        {children}
      </Button>
    ) : (
      <DropdownMenuItem
        disabled={isDisabled}
        onSelect={(e) => e.preventDefault()} // Prevent dropdown from closing on click
        className={cn(commonClassName, 'cursor-pointer focus:bg-destructive/10')}
      >
        {children}
      </DropdownMenuItem>
    );

    return (
      <ConfirmationDialog
        onConfirm={handleClick}
        title={item.confirmation.title}
        description={item.confirmation.description}
        confirmText={item.confirmation.confirmText}
        cancelText={item.confirmation.cancelText}
      >
        {trigger}
      </ConfirmationDialog>
    );
  }

  // Стандартное поведение для элементов без подтверждения
  if (isMobile) {
    return (
      <Button
        variant="ghost"
        key={item.id}
        disabled={isDisabled}
        onClick={handleClick}
        className={cn(commonClassName, 'justify-start px-2 py-1.5 h-auto text-sm')}
      >
        {children}
      </Button>
    );
  }

  const menuItemElement = (
    <DropdownMenuItem
      key={item.id}
      disabled={isDisabled}
      onClick={handleClick}
      className={cn(commonClassName, 'cursor-pointer focus:bg-destructive/10')}
    >
      {children}
    </DropdownMenuItem>
  );

  if (item.tooltip || (item.pro && !enableProFeatures)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{menuItemElement}</TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">
            {item.tooltip || 'Upgrade to Pro to unlock this feature'}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return menuItemElement;
};
