/**
 * Volume control for desktop player
 */
import { memo } from 'react';
import { VolumeX, Volume1, Volume2, X } from '@/utils/iconImports';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface VolumeControlProps {
  volume: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onVolumeChange: (value: number[]) => void;
  onClose: () => void;
}

export const VolumeControl = memo(({ 
  volume, 
  isMuted, 
  onToggleMute, 
  onVolumeChange,
  onClose 
}: VolumeControlProps) => {
  return (
    <div className="flex items-center gap-4">
      {/* Volume Control */}
      <div className="flex items-center gap-2 min-w-[200px]">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleMute}
              title={isMuted ? 'Включить звук' : 'Выключить звук'}
              className="h-10 w-10 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
              ) : volume < 0.5 ? (
                <Volume1 className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
              ) : (
                <Volume2 className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isMuted ? 'Включить звук' : 'Выключить звук'}</p>
          </TooltipContent>
        </Tooltip>
        <div className="flex-1 relative group min-w-[120px]">
          <Slider
            value={[isMuted ? 0 : volume]}
            max={1}
            step={0.01}
            aria-label="Volume"
            onValueChange={onVolumeChange}
            className="cursor-pointer group-hover:scale-y-125 transition-transform duration-200"
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground/80 tabular-nums w-10 text-right">
          {Math.round((isMuted ? 0 : volume) * 100)}%
        </span>
      </div>

      {/* Close Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive hover:scale-110 transition-all duration-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Закрыть плеер</TooltipContent>
      </Tooltip>
    </div>
  );
});

VolumeControl.displayName = 'VolumeControl';
