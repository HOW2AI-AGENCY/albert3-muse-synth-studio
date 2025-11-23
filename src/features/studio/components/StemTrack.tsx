// src/features/studio/components/StemTrack.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Music2, Wand2, Zap, Mic2, Wind, Download, GitCompareArrows } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

// Define the types of stems
type StemType = 'drums' | 'bass' | 'vocals' | 'atmosphere';

// Map stem types to icons
const stemIcons: Record<StemType, React.ElementType> = {
  drums: Music2,
  bass: Zap,
  vocals: Mic2,
  atmosphere: Wind,
};

// Props for the StemTrack component
interface StemTrackProps {
  id: string;
  name: string;
  type: StemType;
  volume: number;
  isMuted: boolean;
  isSolo: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onSoloToggle: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
  onUseAsReference: () => void;
}

/**
 * StemTrack
 *
 * Displays a single stem track with its controls (mute, solo, regenerate),
 * volume slider, and a waveform visualization.
 *
 * @param {StemTrackProps} props The props for the component.
 * @returns {JSX.Element} The rendered stem track component.
 */
const StemTrack: React.FC<StemTrackProps> = ({
  name,
  type,
  volume,
  isMuted,
  isSolo,
  onVolumeChange,
  onMuteToggle,
  onSoloToggle,
  onRegenerate,
  onDownload,
  onUseAsReference,
}) => {
  const Icon = stemIcons[type];

  return (
    <div className="group bg-neutral-900/30 border border-white/5 rounded-lg p-3 hover:bg-neutral-900/50 transition-colors">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-neutral-400 group-hover:text-white transition-colors">
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            {name}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={isSolo ? 'default' : 'secondary'}
              onClick={onSoloToggle}
              className="w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold"
            >
              S
            </Button>
            <Button
              size="sm"
              variant={isMuted ? 'destructive' : 'secondary'}
              onClick={onMuteToggle}
              className="w-5 h-5 flex items-center justify-center rounded text-[9px] font-bold"
            >
              M
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={onRegenerate}
              className="w-5 h-5"
              title="Regenerate Layer"
            >
              <Wand2 className="w-3 h-3 group-hover:animate-pulse" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={onDownload}
              className="w-5 h-5"
              title="Download Stem"
            >
              <Download className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="secondary"
              onClick={onUseAsReference}
              className="w-5 h-5"
              title="Use as Reference"
            >
              <GitCompareArrows className="w-3 h-3" />
            </Button>
          </div>
          <Slider
            value={[volume]}
            onValueChange={(value) => onVolumeChange(value[0])}
            max={100}
            step={1}
            className="w-24"
          />
        </div>
      </div>
      {/* Waveform Row */}
      <div className="h-10 w-full flex items-center gap-[1px] opacity-60 group-hover:opacity-90 transition-opacity">
        {/* Placeholder for waveform visualization */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={i}
            className="bar bg-neutral-600"
            style={{ height: `${Math.random() * 80 + 10}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
};

export default StemTrack;
