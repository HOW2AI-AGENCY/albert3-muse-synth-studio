import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BoostStyleButtonProps {
  onClick: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
}

export const BoostStyleButton = memo(({
  onClick,
  disabled = false,
  isLoading = false,
  className,
}: BoostStyleButtonProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={onClick}
          disabled={disabled || isLoading}
          className={cn('shrink-0', className)}
          aria-label="Улучшить стиль с помощью AI"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="font-medium">Улучшить стиль с AI</p>
          <p className="text-xs text-muted-foreground">
            Suno AI расширит описание стиля для лучших результатов
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
});

BoostStyleButton.displayName = 'BoostStyleButton';
