import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { StudioToolbar } from '@/components/studio/StudioToolbar';
import { StudioTransport } from '@/components/studio/StudioTransport';
import { StudioTimeline } from '@/components/studio/StudioTimeline';
import { StudioMixer } from '@/components/studio/StudioMixer';
import { useStudioSession } from '@/hooks/studio/useStudioSession';

export const Studio = () => {
  const [showMixer, setShowMixer] = useState(false);
  const {
    tracks,
    selectedTrack,
    isPlaying,
    currentTime,
    zoom,
    addTrack,
    removeTrack,
    selectTrack,
    updateTrackVolume,
    updateTrackPan,
    toggleMute,
    toggleSolo,
    play,
    pause,
    stop,
    seek,
    setZoom,
  } = useStudioSession();

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50">
        <div className="px-4 py-3">
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Studio
          </h1>
          <p className="text-sm text-muted-foreground">
            Professional audio workstation
          </p>
        </div>
        <StudioToolbar 
          onAddTrack={addTrack}
          onToggleMixer={() => setShowMixer(!showMixer)}
          showMixer={showMixer}
          zoom={zoom}
          onZoomChange={setZoom}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Timeline Area */}
        <div className={`flex flex-col transition-all ${showMixer ? 'flex-[0.7]' : 'flex-1'}`}>
          {/* Transport Controls */}
          <div className="border-b border-border bg-card/30">
            <StudioTransport
              isPlaying={isPlaying}
              currentTime={currentTime}
              onPlay={play}
              onPause={pause}
              onStop={stop}
              onSeek={seek}
            />
          </div>

          {/* Timeline */}
          <ScrollArea className="flex-1">
            <div className="p-4">
              <StudioTimeline
                tracks={tracks}
                currentTime={currentTime}
                zoom={zoom}
                selectedTrack={selectedTrack}
                onTrackSelect={selectTrack}
                onSeek={seek}
              />
              
              {tracks.length === 0 && (
                <Card className="p-12 text-center border-dashed">
                  <div className="space-y-4">
                    <p className="text-muted-foreground">
                      No tracks yet. Add a track to get started.
                    </p>
                    <Button onClick={addTrack} variant="outline">
                      Add Track
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Mixer Panel */}
        {showMixer && (
          <div className="flex-[0.3] border-l border-border bg-card/30">
            <StudioMixer
              tracks={tracks}
              onVolumeChange={updateTrackVolume}
              onPanChange={updateTrackPan}
              onMuteToggle={toggleMute}
              onSoloToggle={toggleSolo}
              onRemoveTrack={removeTrack}
            />
          </div>
        )}
      </div>
    </div>
  );
};
