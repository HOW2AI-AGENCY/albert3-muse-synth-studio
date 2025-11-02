import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Plus, Sliders, ZoomIn, ZoomOut } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface StudioToolbarProps {
  onAddTrack: () => void;
  onToggleMixer: () => void;
  showMixer: boolean;
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export const StudioToolbar = ({
  onAddTrack,
  onToggleMixer,
  showMixer,
  zoom,
  onZoomChange,
}: StudioToolbarProps) => {
  return (
    <div className="px-4 py-2 flex items-center gap-3 bg-card/30">
      <Button
        onClick={onAddTrack}
        size="sm"
        variant="outline"
        className="gap-2"
      >
        <Plus className="h-4 w-4" />
        Add Track
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <Button
        onClick={onToggleMixer}
        size="sm"
        variant={showMixer ? 'default' : 'outline'}
        className="gap-2"
      >
        <Sliders className="h-4 w-4" />
        Mixer
      </Button>

      <Separator orientation="vertical" className="h-6" />

      <div className="flex items-center gap-2 flex-1 max-w-xs">
        <ZoomOut className="h-4 w-4 text-muted-foreground" />
        <Slider
          value={[zoom]}
          onValueChange={([value]) => onZoomChange(value)}
          min={0.5}
          max={4}
          step={0.1}
          className="flex-1"
        />
        <ZoomIn className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground w-12 text-right">
          {(zoom * 100).toFixed(0)}%
        </span>
      </div>
    </div>
  );
};
