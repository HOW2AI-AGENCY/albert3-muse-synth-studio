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
    <div className="flex items-center gap-4">
      <Button
        size="icon"
        variant="ghost"
        onClick={onPreviousClick}
        title={hasVersions ? "Предыдущая версия (←)" : "Предыдущий трек (←)"}
        className="icon-button-touch hover:bg-primary/10 hover:scale-110 transition-all duration-200 group"
      >
        <SkipBack className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
      </Button>

      <Button
        size="icon"
        variant="default"
        onClick={onTogglePlayPause}
        title={isPlaying ? "Пауза (Space)" : "Воспроизвести (Space)"}
        className="min-h-[56px] min-w-[56px] h-14 w-14 rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-300 hover:scale-110 group relative overflow-hidden touch-optimized"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        {isPlaying ? (
          <Pause className="h-7 w-7 relative z-10" />
        ) : (
          <Play className="h-7 w-7 ml-0.5 relative z-10" />
        )}
      </Button>

      <Button
        size="icon"
        variant="ghost"
        onClick={onNextClick}
        title={hasVersions ? "Следующая версия (→)" : "Следующий трек (→)"}
        className="icon-button-touch hover:bg-primary/10 hover:scale-110 transition-all duration-200 group"
      >
        <SkipForward className="h-5 w-5 group-hover:text-primary transition-colors duration-200" />
      </Button>

      {/* Track Versions */}
      {hasVersions && (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative icon-button-touch hover:bg-primary/10 hover:scale-110 transition-all duration-200"
                  title={`${availableVersions.length} версий`}
                >
                  <List className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-gradient-primary">
                    {availableVersions.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-primary/20 shadow-glow z-[100]">
                {availableVersions.map((version, idx) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      onSwitchVersion(version.id);
                    }}
                    className={`hover:bg-primary/10 transition-colors ${currentVersionIndex === idx ? 'bg-primary/20' : ''}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">
                        V{version.versionNumber || idx + 1}
                      </span>
                      {version.isMasterVersion && (
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipTrigger>
          <TooltipContent>
            <p>Версии трека ({availableVersions.length})</p>
          </TooltipContent>
        </Tooltip>
      )}

      <PlayerQueue />
    </div>
  );
});

PlaybackControls.displayName = 'PlaybackControls';
