/**
 * Playback controls for desktop player
 */
import { memo, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward, List, Star } from '@/utils/iconImports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PlayerQueue } from '../PlayerQueue';
import { useVersionNavigation } from '@/hooks/useVersionNavigation';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';

interface Version {
  id: string;
  versionNumber?: number;
  isMasterVersion?: boolean;
}

interface PlaybackControlsProps {
  isPlaying: boolean;
  hasVersions: boolean;
  availableVersions: Version[];
  currentVersionIndex: number;
  onTogglePlayPause: () => void;
  onSwitchVersion: (versionId: string) => void;
}

export const PlaybackControls = memo(({
  isPlaying,
  hasVersions,
  availableVersions,
  currentVersionIndex,
  onTogglePlayPause,
  onSwitchVersion,
}: PlaybackControlsProps) => {
  const { handleNext, handlePrevious } = useVersionNavigation();
  const currentTime = useAudioPlayerStore((state) => state.currentTime);
  const seekTo = useAudioPlayerStore((state) => state.seekTo);

  const onPreviousClick = useCallback(() => {
    const result = handlePrevious(currentTime);
    if (result === 'restart') {
      seekTo(0);
    }
  }, [handlePrevious, currentTime, seekTo]);

  const onNextClick = useCallback(() => {
    handleNext();
  }, [handleNext]);
  return (
    <div className="flex items-center gap-2">
      <Button
        size="icon"
        variant="ghost"
        onClick={onPreviousClick}
        title={hasVersions ? "Предыдущая версия (←)" : "Предыдущий трек (←)"}
        className="h-7 w-7 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group"
      >
        <SkipBack className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-200" />
      </Button>

      <Button
        size="icon"
        variant="default"
        onClick={onTogglePlayPause}
        title={isPlaying ? "Пауза (Space)" : "Воспроизвести (Space)"}
        className="h-9 w-9 rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-300 hover:scale-110 group relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        {isPlaying ? (
          <Pause className="h-4 w-4 relative z-10 transition-transform duration-200 group-hover:scale-110" />
        ) : (
          <Play className="h-4 w-4 ml-0.5 relative z-10 transition-transform duration-200 group-hover:scale-110" />
        )}
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={onNextClick}
        title={hasVersions ? "Следующая версия (→)" : "Следующий трек (→)"}
        className="h-7 w-7 hover:bg-primary/10 hover:scale-110 transition-all duration-200 group"
      >
        <SkipForward className="h-3.5 w-3.5 group-hover:text-primary transition-colors duration-200" />
      </Button>

      {/* Track Versions - Compact */}
      {hasVersions && (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-7 w-7 hover:bg-primary/10 hover:scale-110 transition-all duration-200"
                  title={`${availableVersions.length} версий`}
                >
                  <List className="h-3.5 w-3.5" />
                  <Badge className="absolute -top-0.5 -right-0.5 h-3 w-3 p-0 flex items-center justify-center text-[8px] bg-gradient-primary">
                    {availableVersions.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-primary/20 shadow-glow z-[100] min-w-[120px]">
                {availableVersions.map((version, idx) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onSwitchVersion(version.id);
                    }}
                    className={`text-xs hover:bg-primary/10 transition-colors ${currentVersionIndex === idx ? 'bg-primary/20' : ''}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">
                        V{version.versionNumber || idx + 1}
                      </span>
                      {version.isMasterVersion && (
                        <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">Версии трека ({availableVersions.length})</p>
          </TooltipContent>
        </Tooltip>
      )}

      <PlayerQueue />
    </div>
  );
});

PlaybackControls.displayName = 'PlaybackControls';
