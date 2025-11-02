import { ScrollArea } from '@/components/ui/scroll-area';
import { StudioTrack } from '@/hooks/studio/useStudioSession';
import { StudioMixerChannel } from './StudioMixerChannel';

interface StudioMixerProps {
  tracks: StudioTrack[];
  onVolumeChange: (trackId: string, volume: number) => void;
  onPanChange: (trackId: string, pan: number) => void;
  onMuteToggle: (trackId: string) => void;
  onSoloToggle: (trackId: string) => void;
  onRemoveTrack: (trackId: string) => void;
}

export const StudioMixer = ({
  tracks,
  onVolumeChange,
  onPanChange,
  onMuteToggle,
  onSoloToggle,
  onRemoveTrack,
}: StudioMixerProps) => {
  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold">Mixer</h2>
        <p className="text-xs text-muted-foreground">
          {tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {tracks.map((track) => (
            <StudioMixerChannel
              key={track.id}
              track={track}
              onVolumeChange={onVolumeChange}
              onPanChange={onPanChange}
              onMuteToggle={onMuteToggle}
              onSoloToggle={onSoloToggle}
              onRemove={onRemoveTrack}
            />
          ))}

          {tracks.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8">
              No tracks in mixer
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
