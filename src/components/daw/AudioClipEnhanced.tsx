/**
 * Enhanced Audio Clip Component
 *
 * Features:
 * - Drag to move
 * - Resize handles for trimming
 * - Fade in/out handles
 * - Waveform visualization
 * - Selection state
 * - Context menu
 *
 * @module components/daw/AudioClipEnhanced
 */

import React, { useCallback, useRef, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useDAWStore, DAWClip } from '@/stores/dawStore';
import { WaveformVisualization } from './WaveformVisualization';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Copy, Scissors, Trash2, Volume2 } from 'lucide-react';
import { getCanvasColors } from '@/utils/canvas-colors';

interface AudioClipEnhancedProps {
  clip: DAWClip;
  trackId: string;
  zoom: number;
  scrollLeft: number;
  trackHeight: number;
  color?: string;
}

type DragMode = 'move' | 'trim-start' | 'trim-end' | 'fade-in' | 'fade-out' | null;

export const AudioClipEnhanced: React.FC<AudioClipEnhancedProps> = ({
  clip,
  trackId: _trackId,
  zoom,
  scrollLeft,
  trackHeight,
  color,
}) => {
  const colors = getCanvasColors();
  const clipColor = color || colors.primary;
  const clipRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const [dragStart, setDragStart] = useState({ x: 0, startTime: 0, duration: 0 });

  const selection = useDAWStore((state) => state.selection);
  const updateClip = useDAWStore((state) => state.updateClip);
  const removeClip = useDAWStore((state) => state.removeClip);
  const duplicateClip = useDAWStore((state) => state.duplicateClip);
  const splitClip = useDAWStore((state) => state.splitClip);
  const selectClip = useDAWStore((state) => state.selectClip);
  const currentTime = useDAWStore((state) => state.timeline.currentTime);
  const snapTimeToGrid = useDAWStore((state) => state.snapTimeToGrid);

  const isSelected = selection.selectedClipIds.has(clip.id);

  // Calculate clip position and size
  const clipLeft = clip.startTime * zoom - scrollLeft;
  const clipWidth = clip.duration * zoom;

  // All hooks must be called before any early returns
  const handleMouseDown = useCallback(
    (e: React.MouseEvent, mode: DragMode) => {
      e.stopPropagation();

      if (mode === 'move') {
        selectClip(clip.id, e.shiftKey);
      }

      setDragMode(mode);
      setDragStart({
        x: e.clientX,
        startTime: clip.startTime,
        duration: clip.duration,
      });
    },
    [clip.id, clip.startTime, clip.duration, selectClip]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragMode) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaTime = deltaX / zoom;

      switch (dragMode) {
        case 'move': {
          const newStartTime = snapTimeToGrid(dragStart.startTime + deltaTime);
          if (newStartTime >= 0) {
            updateClip(clip.id, { startTime: Math.max(0, newStartTime) });
          }
          break;
        }
        case 'trim-start': {
          const newStartTime = snapTimeToGrid(dragStart.startTime + deltaTime);
          const newDuration = dragStart.duration - deltaTime;
          if (newDuration > 0.1 && newStartTime >= 0) {
            updateClip(clip.id, {
              startTime: newStartTime,
              duration: newDuration,
              offset: clip.offset + deltaTime,
            });
          }
          break;
        }
        case 'trim-end': {
          const newDuration = dragStart.duration + deltaTime;
          if (newDuration > 0.1) {
            updateClip(clip.id, { duration: newDuration });
          }
          break;
        }
        case 'fade-in': {
          const newFadeIn = Math.max(0, Math.min(clip.duration / 2, (dragStart.x + deltaX) / zoom));
          updateClip(clip.id, { fadeIn: newFadeIn });
          break;
        }
        case 'fade-out': {
          const newFadeOut = Math.max(0, Math.min(clip.duration / 2, deltaTime));
          updateClip(clip.id, { fadeOut: newFadeOut });
          break;
        }
      }
    },
    [dragMode, dragStart, clip.id, clip.duration, clip.offset, zoom, snapTimeToGrid, updateClip]
  );

  const handleMouseUp = useCallback(() => {
    setDragMode(null);
  }, []);

  // Add global mouse event listeners when dragging
  useEffect(() => {
    if (dragMode) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragMode, handleMouseMove, handleMouseUp]);

  const handleDelete = useCallback(() => {
    removeClip(clip.id);
  }, [clip.id, removeClip]);

  const handleDuplicate = useCallback(() => {
    duplicateClip(clip.id);
  }, [clip.id, duplicateClip]);

  const handleSplit = useCallback(() => {
    if (currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration) {
      splitClip(clip.id, currentTime);
    }
  }, [clip.id, clip.startTime, clip.duration, currentTime, splitClip]);

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.detail === 1) {
        // Single click - select
        selectClip(clip.id, e.shiftKey);
      }
      // Double click could open editor dialog
    },
    [clip.id, selectClip]
  );

  // ✅ Check visibility AFTER all hooks are called (Rules of Hooks compliance)
  const isVisible = clipLeft + clipWidth > 0 && clipLeft < window.innerWidth;

  // Prevent rendering if not visible (performance optimization)
  if (!isVisible) {
    return null;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={clipRef}
          className={cn(
            'absolute rounded-md overflow-hidden cursor-move select-none',
            'border-2 transition-all',
            isSelected ? 'border-primary shadow-lg ring-2 ring-primary/30' : 'border-transparent',
            dragMode && 'opacity-80'
          )}
          style={{
            left: `${clipLeft}px`,
            width: `${clipWidth}px`,
            height: `${trackHeight - 8}px`,
            top: '4px',
            backgroundColor: clipColor + '40',
          }}
          onMouseDown={(e) => handleMouseDown(e, 'move')}
          onClick={handleClick}
        >
          {/* Waveform Background */}
          <div className="absolute inset-0 opacity-60">
            <WaveformVisualization
              audioUrl={clip.audioUrl}
              width={clipWidth}
              height={trackHeight - 8}
              color={clipColor}
              backgroundColor="transparent"
              zoom={zoom}
              startTime={clip.offset}
              duration={clip.duration}
            />
          </div>

          {/* Fade In Overlay */}
          {clip.fadeIn > 0 && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-black/60 to-transparent pointer-events-none"
              style={{ width: `${(clip.fadeIn / clip.duration) * 100}%` }}
            />
          )}

          {/* Fade Out Overlay */}
          {clip.fadeOut > 0 && (
            <div
              className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-black/60 to-transparent pointer-events-none"
              style={{ width: `${(clip.fadeOut / clip.duration) * 100}%` }}
            />
          )}

          {/* Clip Info */}
          <div className="absolute top-1 left-2 right-2 flex items-center justify-between pointer-events-none">
            <span className="text-xs font-medium text-white drop-shadow-md truncate">
              {clip.name}
            </span>
            {clip.volume !== 1.0 && (
              <div className="flex items-center gap-1 text-xs text-white/80">
                <Volume2 className="h-3 w-3" />
                <span>{Math.round(clip.volume * 100)}%</span>
              </div>
            )}
          </div>

          {/* Trim Handles */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
            onMouseDown={(e) => handleMouseDown(e, 'trim-start')}
            title="Trim start"
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-white/20 transition-colors"
            onMouseDown={(e) => handleMouseDown(e, 'trim-end')}
            title="Trim end"
          />

          {/* Fade Handles (only visible when selected) */}
          {isSelected && (
            <>
              <div
                className="absolute left-2 top-2 bottom-2 w-1 bg-primary/60 rounded-full cursor-pointer hover:bg-primary transition-colors"
                onMouseDown={(e) => handleMouseDown(e, 'fade-in')}
                title="Fade in"
                style={{ width: `${Math.max(4, (clip.fadeIn / clip.duration) * clipWidth)}px` }}
              />
              <div
                className="absolute right-2 top-2 bottom-2 w-1 bg-primary/60 rounded-full cursor-pointer hover:bg-primary transition-colors"
                onMouseDown={(e) => handleMouseDown(e, 'fade-out')}
                title="Fade out"
                style={{ width: `${Math.max(4, (clip.fadeOut / clip.duration) * clipWidth)}px` }}
              />
            </>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <ContextMenuItem onClick={handleDuplicate}>
          <Copy className="h-4 w-4 mr-2" />
          Duplicate Clip
        </ContextMenuItem>
        <ContextMenuItem
          onClick={handleSplit}
          disabled={currentTime < clip.startTime || currentTime > clip.startTime + clip.duration}
        >
          <Scissors className="h-4 w-4 mr-2" />
          Split at Playhead
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleDelete} className="text-destructive">
          <Trash2 className="h-4 w-4 mr-2" />
          Delete Clip
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
