import React, { useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTrackVersions } from '@/features/tracks/hooks';
import { cn } from '@/lib/utils';

interface TrackVariantSelectorProps {
  trackId: string;
  currentVersionIndex: number;
  onVersionChange: (versionIndex: number) => void;
  className?: string;
}

export const TrackVariantSelector: React.FC<TrackVariantSelectorProps> = ({ 
  trackId,
  currentVersionIndex,
  onVersionChange,
  className 
}) => {
  const { versionCount, isLoading } = useTrackVersions(trackId, true);

  // Переключение на следующую версию
  const handleNextVersion = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    const totalVersions = versionCount + 1;
    const nextIndex = (currentVersionIndex + 1) % totalVersions;
    
    console.log('Switching version:', { 
      current: currentVersionIndex, 
      next: nextIndex, 
      total: totalVersions 
    });
    
    onVersionChange(nextIndex);
  }, [currentVersionIndex, versionCount, onVersionChange]);

  // Не показываем селектор если нет дополнительных версий
  if (isLoading || versionCount === 0) {
    return null;
  }

  const totalVersions = versionCount + 1;
  const displayIndex = currentVersionIndex + 1;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNextVersion}
            className={cn(
              "h-7 px-2.5 gap-1.5 text-xs font-semibold",
              "bg-background/95 hover:bg-background backdrop-blur-md",
              "border border-border/50 shadow-lg",
              "transition-all duration-200 hover:scale-105 active:scale-95",
              className
            )}
          >
            <span className="tabular-nums">{displayIndex}/{totalVersions}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Переключить вариант трека</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};