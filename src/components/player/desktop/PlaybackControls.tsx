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
import { motion, AnimatePresence } from 'framer-motion';

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
      <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.1 }}>
        <Button
          size="icon"
          variant="ghost"
          onClick={onPreviousClick}
          title={hasVersions ? "Предыдущая версия (←)" : "Предыдущий трек (←)"}
          className="h-6 w-6 hover:bg-primary/10 transition-all duration-200 group"
        >
          <SkipBack className="h-3 w-3 group-hover:text-primary transition-colors duration-200" />
        </Button>
      </motion.div>

      <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.1 }}>
        <Button
          size="icon"
          variant="default"
          onClick={onTogglePlayPause}
          title={isPlaying ? "Пауза (Space)" : "Воспроизвести (Space)"}
          className="h-8 w-8 rounded-full bg-gradient-primary hover:shadow-glow-primary transition-all duration-300 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          <AnimatePresence mode="wait">
            {isPlaying ? (
              <motion.div
                key="pause"
                initial={{ scale: 0.8, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.8, rotate: 90 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative z-10"
              >
                <Pause className="h-3.5 w-3.5" />
              </motion.div>
            ) : (
              <motion.div
                key="play"
                initial={{ scale: 0.8, rotate: 90 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0.8, rotate: -90 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="relative z-10"
              >
                <Play className="h-3.5 w-3.5 ml-0.5" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.1 }}>
        <Button
          size="icon"
          variant="ghost"
          onClick={onNextClick}
          title={hasVersions ? "Следующая версия (→)" : "Следующий трек (→)"}
          className="h-6 w-6 hover:bg-primary/10 transition-all duration-200 group"
        >
          <SkipForward className="h-3 w-3 group-hover:text-primary transition-colors duration-200" />
        </Button>
      </motion.div>

      {/* Track Versions - Compact */}
      {hasVersions && (
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <motion.div whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.1 }}>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative h-6 w-6 hover:bg-primary/10 transition-all duration-200"
                    title={`${availableVersions.length} версий`}
                  >
                    <List className="h-3 w-3" />
                    <Badge className="absolute -top-0.5 -right-0.5 h-3 w-3 p-0 flex items-center justify-center text-[7px] bg-gradient-primary">
                      {availableVersions.length}
                    </Badge>
                  </Button>
                </motion.div>
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
