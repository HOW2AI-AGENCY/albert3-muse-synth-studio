/**
 * Mobile Track List Component
 *
 * Compact track list optimized for mobile screens:
 * - Vertical stacking
 * - Swipe actions
 * - Touch-friendly controls
 * - Minimalist waveform display
 *
 * @module components/daw/mobile/MobileTrackList
 */

import React, { useCallback } from 'react';
import { DAWTrack } from '@/stores/dawStore';
import { useDAWStore } from '@/stores/dawStore';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Volume2,
  VolumeX,
  Music2,
  MoreVertical,
  Trash2,
  Copy,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { getCanvasColors } from '@/utils/canvas-colors';

interface MobileTrackListProps {
  tracks: DAWTrack[];
}

export const MobileTrackList: React.FC<MobileTrackListProps> = ({ tracks }) => {
  const colors = getCanvasColors();
  const updateTrack = useDAWStore((state) => state.updateTrack);
  const removeTrack = useDAWStore((state) => state.removeTrack);
  const duplicateTrack = useDAWStore((state) => state.duplicateTrack);
  const selectTrack = useDAWStore((state) => state.selectTrack);
  const selection = useDAWStore((state) => state.selection);

  const handleToggleMute = useCallback(
    (trackId: string, currentMute: boolean) => {
      updateTrack(trackId, { isMuted: !currentMute });
    },
    [updateTrack]
  );

  const handleToggleSolo = useCallback(
    (trackId: string, currentSolo: boolean) => {
      updateTrack(trackId, { isSolo: !currentSolo });
    },
    [updateTrack]
  );

  const handleVolumeChange = useCallback(
    (trackId: string, value: number[]) => {
      updateTrack(trackId, { volume: value[0] });
    },
    [updateTrack]
  );

  const handleDelete = useCallback(
    (trackId: string, type: string) => {
      if (type === 'master') return;
      removeTrack(trackId);
    },
    [removeTrack]
  );

  const handleDuplicate = useCallback(
    (trackId: string) => {
      duplicateTrack(trackId);
    },
    [duplicateTrack]
  );

  return (
    <div className="divide-y divide-border">
      {tracks.map((track) => {
        const isSelected = selection.selectedTrackIds.has(track.id);
        const clipCount = track.clips.length;
        const totalDuration = track.clips.reduce(
          (sum, clip) => sum + clip.duration,
          0
        );

        return (
          <div
            key={track.id}
            className={cn(
              'p-3 transition-colors',
              isSelected && 'bg-accent/20',
              track.isMuted && 'opacity-60'
            )}
            onClick={() => selectTrack(track.id, false)}
          >
            {/* Track Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex-1 min-w-0 mr-2">
                <h4 className="text-sm font-medium truncate">{track.name}</h4>
                {track.stemType && (
                  <p className="text-xs text-muted-foreground truncate">
                    {track.stemType}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1">
                {/* Solo */}
                <Button
                  variant={track.isSolo ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleSolo(track.id, track.isSolo);
                  }}
                >
                  S
                </Button>

                {/* Mute */}
                <Button
                  variant={track.isMuted ? 'destructive' : 'outline'}
                  size="sm"
                  className="h-7 w-7 p-0 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleMute(track.id, track.isMuted);
                  }}
                >
                  M
                </Button>

                {/* More Options */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicate(track.id);
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    {track.type !== 'master' && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(track.id, track.type);
                        }}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Volume Control */}
            <div className="flex items-center gap-2 mb-2">
              {track.isMuted ? (
                <VolumeX className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <Volume2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <Slider
                value={[track.volume]}
                onValueChange={(value) => handleVolumeChange(track.id, value)}
                max={1}
                step={0.01}
                className="flex-1"
              />
              <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">
                {Math.round(track.volume * 100)}%
              </span>
            </div>

            {/* Track Info */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Music2 className="h-3 w-3" />
              <span>{clipCount} clip{clipCount !== 1 ? 's' : ''}</span>
              {totalDuration > 0 && (
                <>
                  <span>•</span>
                  <span>{Math.round(totalDuration)}s</span>
                </>
              )}
            </div>

            {/* Color Indicator */}
            {track.color && (
              <div
                className="h-1 rounded-full mt-2"
                style={{ backgroundColor: track.color }}
              />
            )}

            {/* Clips Preview */}
            {clipCount > 0 && (
              <div className="mt-2 h-8 bg-muted rounded relative overflow-hidden">
                {track.clips.map((clip) => {
                  const maxDuration = Math.max(...track.clips.map(c => c.startTime + c.duration));
                  const left = (clip.startTime / maxDuration) * 100;
                  const width = (clip.duration / maxDuration) * 100;

                  return (
                    <div
                      key={clip.id}
                      className="absolute h-full opacity-60"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        backgroundColor: track.color || colors.primary,
                      }}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
