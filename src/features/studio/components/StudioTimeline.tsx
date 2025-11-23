// src/features/studio/components/StudioTimeline.tsx
import React from 'react';
import { useStudioStore } from '@/stores/studioStore';
import { formatTime } from '@/utils/formatters'; // Assuming a time formatter exists

/**
 * StudioTimeline
 *
 * Displays the global timeline overview for the track,
 * including the playhead and time markers.
 * It reflects the current playback time from the useStudioStore.
 *
 * @returns {JSX.Element} The rendered timeline component.
 */
const StudioTimeline: React.FC = () => {
  const { currentTime } = useStudioStore();
  const totalDuration = 165; // 2:45 in seconds, as a dummy value

  const playheadPosition = (currentTime / totalDuration) * 100;

  return (
    <section className="relative px-5 py-4 border-b border-white/5 bg-neutral-950/30">
      <div className="flex justify-between items-end mb-2">
        <span className="text-xs font-medium text-violet-400 flex items-center gap-1">
          <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-pulse"></div>
          Editor Mode
        </span>
        <span className="text-xs font-mono text-neutral-500">
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </span>
      </div>
      {/* Playhead Ruler */}
      <div className="relative w-full h-4 flex justify-between px-1">
        <div
          className="absolute -top-1 bottom-0 w-[1px] bg-violet-500 h-32 z-10 shadow-[0_0_8px_rgba(139,92,246,0.8)]"
          style={{ left: `${playheadPosition}%` }}
        >
          <div className="absolute -top-1 -left-[3px] w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-violet-500"></div>
        </div>
        {/* Ticks */}
        <div className="h-full w-[1px] bg-neutral-800"></div>
        <div className="h-1/2 w-[1px] bg-neutral-800/50"></div>
        <div className="h-full w-[1px] bg-neutral-800"></div>
        <div className="h-1/2 w-[1px] bg-neutral-800/50"></div>
        <div className="h-full w-[1px] bg-neutral-800"></div>
        <div className="h-1/2 w-[1px] bg-neutral-800/50"></div>
        <div className="h-full w-[1px] bg-neutral-800"></div>
        <div className="h-1/2 w-[1px] bg-neutral-800/50"></div>
        <div className="h-full w-[1px] bg-neutral-800"></div>
      </div>
    </section>
  );
};

export default StudioTimeline;
