import React from 'react';
import { Track } from '@/types/daw';

interface TrackInfoPanelProps {
  track: Track | null;
  onVolumeChange: (newVolume: number) => void;
}

export const TrackInfoPanel: React.FC<TrackInfoPanelProps> = ({ track, onVolumeChange }) => {
  if (!track) {
    return <div className="h-full p-4 border-r border-border">Select a track</div>;
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(parseFloat(e.target.value));
  };

  return (
    <div className="h-full p-4 border-r border-border">
      <h3 className="text-lg font-semibold mb-4">{track.name}</h3>
      <div>
        <label htmlFor="volume">Volume</label>
        <input
          type="range"
          id="volume"
          min="0"
          max="1"
          step="0.01"
          value={track.volume}
          onChange={handleVolumeChange}
        />
      </div>
      <div>
        <button>Mute</button>
        <button>Solo</button>
      </div>
    </div>
  );
};
