import React from 'react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { logger } from '@/utils/logger';
import type { MenuItem } from './TrackActionsMenu.types';

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
  const isDisabled = item.disabled || (item.pro && !enableProFeatures);

  const menuItemElement = (
    <DropdownMenuItem
      key={item.id}
      disabled={isDisabled}
      onClick={() => {
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
      }}
      className={cn(
        'flex items-center gap-2 cursor-pointer',
        item.danger && 'text-destructive focus:text-destructive focus:bg-destructive/10',
        isDisabled && 'opacity-50'
      )}
    >
      {item.icon}
      <span className="flex-1">{item.label}</span>

      {item.pro && !enableProFeatures && (
        <Badge variant="secondary" className="h-4 px-1.5 text-[10px] gap-1">
          <Lock className="w-2.5 h-2.5" />
          Pro
        </Badge>
      )}

      {item.shortcut && !item.pro && (
        <kbd className="hidden sm:inline-flex h-5 px-1.5 items-center justify-center rounded border border-border bg-muted text-[10px] font-mono text-muted-foreground">
          {item.shortcut}
        </kbd>
      )}
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
