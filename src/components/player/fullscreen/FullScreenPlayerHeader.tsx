/**
 * Full Screen Player Header Component
 * Header with minimize, lyrics toggle, share, versions, and queue buttons
 */

import { memo, useCallback } from 'react';
import { Minimize2, Eye, EyeOff, Share2, Repeat, Star } from '@/utils/iconImports';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayerQueue } from '../PlayerQueue';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FullScreenPlayerHeaderProps {
  currentTrack: {
    id: string;
    title: string;
  };
  showLyrics: boolean;
  onMinimize: () => void;
  onToggleLyrics: () => void;
  availableVersions?: Array<{
    id: string;
    versionNumber?: number;
    isMasterVersion?: boolean;
  }>;
  currentVersionIndex?: number;
  onSwitchVersion?: (versionId: string) => void;
}

export const FullScreenPlayerHeader = memo(({ 
  currentTrack,
  showLyrics,
  onMinimize,
  onToggleLyrics,
  availableVersions = [],
  currentVersionIndex = 0,
  onSwitchVersion,
}: FullScreenPlayerHeaderProps) => {
  const { vibrate } = useHapticFeedback();
  const { toast } = useToast();

  const handleShare = useCallback(async () => {
    vibrate('light');
    if (navigator.share) {
      try {
        await navigator.share({
          title: currentTrack?.title || '',
          text: `Слушай этот трек: ${currentTrack?.title || ''}`,
          url: window.location.href,
        });
      } catch (error) {
        logger.error('Error sharing', error instanceof Error ? error : new Error(String(error)), 'FullScreenPlayerHeader');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Ссылка скопирована",
        description: "Ссылка на трек скопирована в буфер обмена",
      });
    }
  }, [vibrate, currentTrack, toast]);

  const hasVersions = availableVersions.length > 1;

  return (
    <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/40">
      <div className="flex items-center justify-between px-[--space-3] md:px-[--space-6] py-[--space-3] md:py-[--space-4] touch-target-comfortable">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            vibrate('medium');
            onMinimize();
          }}
          className="h-10 w-10 md:h-11 md:w-11 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200"
          aria-label="Свернуть плеер"
        >
          <Minimize2 className="h-4 w-4 md:h-5 md:w-5" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            vibrate('light');
            onToggleLyrics();
          }}
          className={`h-10 w-10 md:h-11 md:w-11 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] hover:scale-105 transition-all duration-200 ${
            showLyrics ? 'bg-primary/10 text-primary' : 'hover:bg-primary/10'
          }`}
          aria-label={showLyrics ? "Скрыть текст" : "Показать текст"}
        >
          {showLyrics ? <EyeOff className="h-4 w-4 md:h-5 md:w-5" /> : <Eye className="h-4 w-4 md:h-5 md:w-5" />}
        </Button>

        <div className="flex items-center gap-[--space-1.5] md:gap-[--space-2]">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleShare}
            className="h-10 w-10 md:h-11 md:w-11 min-h-[40px] min-w-[40px] md:min-h-[44px] md:min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200"
            aria-label="Поделиться"
          >
            <Share2 className="h-4 w-4 md:h-5 md:w-5" />
          </Button>

          {hasVersions && onSwitchVersion && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="relative h-11 w-11 min-h-[44px] min-w-[44px] hover:bg-primary/10 hover:scale-105 transition-all duration-200"
                >
                  <Repeat className="h-5 w-5" />
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-gradient-primary animate-pulse">
                    {availableVersions.length}
                  </Badge>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-card/95 backdrop-blur-xl border-primary/20 shadow-glow z-[100]">
                {availableVersions.map((version, idx) => (
                  <DropdownMenuItem
                    key={version.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      vibrate('light');
                      onSwitchVersion(version.id);
                    }}
                    className={`hover:bg-primary/10 transition-colors ${currentVersionIndex === idx ? 'bg-primary/20' : ''}`}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <span className="flex-1">
                        V{version.versionNumber || idx + 1}
                      </span>
                      {version.isMasterVersion && (
                        <Star className="h-3 w-3 fill-amber-500 text-amber-500 animate-pulse" />
                      )}
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <PlayerQueue />
        </div>
      </div>
    </div>
  );
}, (prev, next) => 
  prev.currentTrack.id === next.currentTrack.id &&
  prev.showLyrics === next.showLyrics &&
  prev.currentVersionIndex === next.currentVersionIndex &&
  prev.availableVersions?.length === next.availableVersions?.length
);

FullScreenPlayerHeader.displayName = 'FullScreenPlayerHeader';
