import { Info } from '@/utils/iconImports';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface InfoTooltipProps {
  content: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  iconClassName?: string;
}

export const InfoTooltip = ({ 
  content, 
  side = 'right', 
  className, 
  iconClassName 
}: InfoTooltipProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center justify-center",
            "w-4 h-4 rounded-full",
            "text-muted-foreground hover:text-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "transition-colors",
            className
          )}
          aria-label="Показать подсказку"
          role="button"
          tabIndex={0}
        >
          <Info className={cn("w-3.5 h-3.5", iconClassName)} />
        </span>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
};
