import React, { useState, useEffect } from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Timeline } from '@/components/daw/Timeline';
import { TrackLane } from '@/components/daw/TrackLane';
import { TrackInfoPanel } from '@/components/daw/TrackInfoPanel';
import { Track } from '@/types/daw';
import { PlaybackService } from '@/services/playbackService';

const initialTracksData: Track[] = [
  {
    id: '1',
    name: 'Drums',
    clips: [{ id: '1', name: 'Kick', start: 0, end: 4, audioUrl: '' }],
    volume: 0.9,
    isMuted: false,
    isSolo: false,
  },
  {
    id: '2',
    name: 'Bass',
    clips: [{ id: '2', name: 'Bassline', start: 2, end: 8, audioUrl: '' }],
    volume: 0.7,
    isMuted: false,
    isSolo: false,
  },
  {
    id: '3',
    name: 'Synth',
    clips: [{ id: '3', name: 'Melody', start: 4, end: 12, audioUrl: '' }],
    volume: 0.8,
    isMuted: false,
    isSolo: false,
  },
];

const playbackService = new PlaybackService();

export const DAW: React.FC = () => {
  const [tracks, setTracks] = useState<Track[]>(initialTracksData);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>('1');
  const [playbackPosition, setPlaybackPosition] = useState(0);

  useEffect(() => {
    playbackService.subscribe(setPlaybackPosition);
    return () => playbackService.unsubscribe();
  }, []);

  const handleVolumeChange = (trackId: string, newVolume: number) => {
    setTracks(currentTracks =>
      currentTracks.map(t => (t.id === trackId ? { ...t, volume: newVolume } : t))
    );
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId) || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      <div className="h-16 border-b border-border flex items-center px-4 space-x-4">
        <button onClick={() => playbackService.play()}>Play</button>
        <button onClick={() => playbackService.pause()}>Pause</button>
        <button onClick={() => playbackService.stop()}>Stop</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <TrackInfoPanel
              track={selectedTrack}
              onVolumeChange={(newVolume) => {
                if(selectedTrack) {
                  handleVolumeChange(selectedTrack.id, newVolume)
                }
              }}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={80}>
            <div className="h-full flex flex-col">
              <Timeline playbackPosition={playbackPosition} />
              <div className="flex-1 overflow-y-auto">
                {tracks.map(track => (
                  <TrackLane key={track.id} track={track} />
                ))}
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
