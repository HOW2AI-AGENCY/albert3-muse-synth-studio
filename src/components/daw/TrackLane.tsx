import React from 'react';
import { Track } from '@/types/daw';
import { AudioClip } from './AudioClip';

interface TrackLaneProps {
  track: Track;
}

export const TrackLane: React.FC<TrackLaneProps> = ({ track }) => {
  return (
    <div className="relative h-24 bg-surface-variant border-b border-border">
      {track.clips.map((clip) => (
        <AudioClip key={clip.id} clip={clip} />
      ))}
    </div>
  );
};
