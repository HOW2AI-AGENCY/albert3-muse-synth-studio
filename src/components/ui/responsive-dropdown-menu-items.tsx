
import React from 'react';
import { useResponsiveMenuContext } from './responsive-dropdown-menu';
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger } from './dropdown-menu';
import { Button } from './button';
import { Separator } from './separator';
import { cn } from '@/lib/utils';

export const ResponsiveDropdownMenuItem = ({ children, onClick, className, ...props }: React.ComponentProps<typeof DropdownMenuItem>) => {
  const { isMobile } = useResponsiveMenuContext();

  if (isMobile) {
    return (
      <Button
        variant="ghost"
        className={cn("w-full justify-start px-2 py-1.5", className)}
        onClick={onClick}
        {...props}
      >
        {children}
      </Button>
    );
  }

  return <DropdownMenuItem onClick={onClick} className={className} {...props}>{children}</DropdownMenuItem>;
};

export const ResponsiveDropdownMenuSeparator = (props: React.ComponentProps<typeof DropdownMenuSeparator>) => {
  const { isMobile } = useResponsiveMenuContext();

  if (isMobile) {
    return <Separator className="my-2" {...props} />;
  }

  return <DropdownMenuSeparator {...props} />;
};


export const ResponsiveDropdownMenuSub = ({ children }: { children: React.ReactNode }) => {
    const { isMobile } = useResponsiveMenuContext();

    if (isMobile) {
      return <div className="space-y-1">{children}</div>;
    }

    return <DropdownMenuSub>{children}</DropdownMenuSub>;
  };

  export const ResponsiveDropdownMenuSubTrigger = ({ children }: { children: React.ReactNode }) => {
    const { isMobile } = useResponsiveMenuContext();

    if (isMobile) {
      // На мобильном устройстве подменю будет просто заголовком
      return (
        <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
          {children}
        </div>
      );
    }

    return <DropdownMenuSubTrigger>{children}</DropdownMenuSubTrigger>;
  };

  export const ResponsiveDropdownMenuSubContent = ({ children }: { children: React.ReactNode }) => {
    const { isMobile } = useResponsiveMenuContext();

    if (isMobile) {
      // На мобильном устройстве контент подменю рендерится с отступом
      return <div className="flex flex-col space-y-1 pl-4">{children}</div>;
    }

    return <DropdownMenuSubContent>{children}</DropdownMenuSubContent>;
  };
