/**
 * Enhanced Track Lane Component
 *
 * Features:
 * - Drag and drop clips
 * - Resize clips (trim)
 * - Waveform visualization
 * - Solo/Mute/Volume controls
 * - Track effects
 *
 * @module components/daw/TrackLaneEnhanced
 */

import React, { useCallback, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { useDAWStore, type DAWTrack } from '@/stores/dawStore';
import { AudioClipEnhanced } from './AudioClipEnhanced';
import { Volume2, VolumeX, Music2, Trash2, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getCanvasColors } from '@/utils/canvas-colors';

interface TrackLaneEnhancedProps {
  track: DAWTrack;
  zoom: number;
  scrollLeft: number;
  isSelected?: boolean;
  onTrackClick?: () => void;
}

export const TrackLaneEnhanced: React.FC<TrackLaneEnhancedProps> = ({
  track,
  zoom,
  scrollLeft,
  isSelected = false,
  onTrackClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const colors = getCanvasColors();

  const updateTrack = useDAWStore((state) => state.updateTrack);
  const removeTrack = useDAWStore((state) => state.removeTrack);
  const duplicateTrack = useDAWStore((state) => state.duplicateTrack);
  const addClip = useDAWStore((state) => state.addClip);
  const selectTrack = useDAWStore((state) => state.selectTrack);

  // Time to pixel conversion handled by AudioClipEnhanced

  // Convert pixel to time
  const pixelToTime = useCallback(
    (pixel: number) => {
      return (pixel + scrollLeft) / zoom;
    },
    [zoom, scrollLeft]
  );

  const handleVolumeChange = useCallback(
    (value: number[]) => {
      updateTrack(track.id, { volume: value[0] });
    },
    [track.id, updateTrack]
  );

  const handleToggleMute = useCallback(() => {
    updateTrack(track.id, { isMuted: !track.isMuted });
  }, [track.id, track.isMuted, updateTrack]);

  const handleToggleSolo = useCallback(() => {
    updateTrack(track.id, { isSolo: !track.isSolo });
  }, [track.id, track.isSolo, updateTrack]);

  const handleDelete = useCallback(() => {
    if (track.type === 'master') return;
    removeTrack(track.id);
  }, [track.id, track.type, removeTrack]);

  const handleDuplicate = useCallback(() => {
    duplicateTrack(track.id);
  }, [track.id, duplicateTrack]);

  // Handle drag and drop of audio files
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const audioFile = files.find((f) => f.type.startsWith('audio/'));

      if (audioFile) {
        const dropX = e.clientX - (containerRef.current?.getBoundingClientRect().left || 0);
        const dropTime = pixelToTime(dropX);

        // Create object URL for the file
        const audioUrl = URL.createObjectURL(audioFile);

        addClip(track.id, {
          name: audioFile.name,
          audioUrl,
          startTime: dropTime,
          duration: 30, // Default duration, will be updated when audio loads
          offset: 0,
          volume: 1.0,
          fadeIn: 0,
          fadeOut: 0,
        });
      }
    },
    [track.id, pixelToTime, addClip]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleTrackClick = useCallback(() => {
    selectTrack(track.id, false);
    onTrackClick?.();
  }, [track.id, selectTrack, onTrackClick]);

  return (
    <div
      className={cn(
        'flex border-b border-border transition-colors',
        isSelected && 'bg-accent/20',
        track.isMuted && 'opacity-50'
      )}
      style={{ height: track.height }}
    >
      {/* Track Controls */}
      <div className="w-48 flex-shrink-0 border-r border-border p-2 space-y-2 bg-surface">
        {/* Track Name and Controls */}
        <div className="flex items-center justify-between gap-1">
          <div className="flex-1 min-w-0">
            <h4
              className="text-sm font-medium truncate cursor-pointer hover:text-primary"
              onClick={handleTrackClick}
              title={track.name}
            >
              {track.name}
            </h4>
            {track.stemType && (
              <p className="text-xs text-muted-foreground truncate">{track.stemType}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <Music2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Track
              </DropdownMenuItem>
              {track.type !== 'master' && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Track
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Solo/Mute Buttons */}
        <div className="flex items-center gap-1">
          <Button
            variant={track.isSolo ? 'default' : 'outline'}
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={handleToggleSolo}
          >
            S
          </Button>
          <Button
            variant={track.isMuted ? 'destructive' : 'outline'}
            size="sm"
            className="h-7 flex-1 text-xs"
            onClick={handleToggleMute}
          >
            M
          </Button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center gap-2">
          {track.isMuted ? (
            <VolumeX className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          ) : (
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          )}
          <Slider
            value={[track.volume]}
            onValueChange={handleVolumeChange}
            max={1}
            step={0.01}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-8 text-right tabular-nums">
            {Math.round(track.volume * 100)}
          </span>
        </div>

        {/* Track Color Indicator */}
        {track.color && (
          <div
            className="h-1 rounded-full"
            style={{ backgroundColor: track.color }}
          />
        )}
      </div>

      {/* Track Content Area */}
      <div
        ref={containerRef}
        className={cn(
          'flex-1 relative overflow-hidden',
          isDragOver && 'bg-primary/10 border-2 border-dashed border-primary'
        )}
        style={{
          backgroundImage: track.type !== 'master'
            ? `repeating-linear-gradient(90deg, transparent, transparent 59px, ${colors.border} 59px, ${colors.border} 60px)`
            : undefined,
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {/* Render Clips */}
        {track.clips.map((clip) => (
          <AudioClipEnhanced
            key={clip.id}
            clip={clip}
            trackId={track.id}
            zoom={zoom}
            scrollLeft={scrollLeft}
            trackHeight={track.height}
            color={track.color}
          />
        ))}

        {/* Empty track message */}
        {track.clips.length === 0 && track.type !== 'master' && !isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground pointer-events-none">
            Drag audio files here or use the library
          </div>
        )}

        {isDragOver && (
          <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-primary pointer-events-none">
            Drop audio file here
          </div>
        )}
      </div>
    </div>
  );
};
