import React from 'react';
import { Clip } from '@/types/daw';

interface AudioClipProps {
  clip: Clip;
}

const SCALE = 60; // 60px per second

export const AudioClip: React.FC<AudioClipProps> = ({ clip }) => {
  const style = {
    left: `${clip.start * SCALE}px`,
    width: `${(clip.end - clip.start) * SCALE}px`,
  };

  return (
    <div className="absolute bg-primary rounded-lg h-full" style={style}>
      <p className="text-sm text-primary-foreground p-1">{clip.name}</p>
    </div>
  );
};
