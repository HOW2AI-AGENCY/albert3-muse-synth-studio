import React from 'react';

interface TimelineProps {
  playbackPosition: number;
}

export const Timeline: React.FC<TimelineProps> = ({ playbackPosition }) => {
  return (
    <div className="relative h-12 bg-surface border-b border-border">
      {/* Ruler */}
      <div className="absolute top-0 left-0 w-full h-full flex items-end">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="h-4 border-l border-muted-foreground"
            style={{ width: '60px' }}
          >
            <span className="text-xs text-muted-foreground pl-1">{i}s</span>
          </div>
        ))}
      </div>
      {/* Playback Marker */}
      <div
        className="absolute top-0 left-0 w-0.5 h-full bg-red-500"
        style={{ transform: `translateX(${playbackPosition * 60}px)` }} // 60px per second
      />
    </div>
  );
};
