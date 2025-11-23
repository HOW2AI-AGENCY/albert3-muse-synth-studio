// src/features/studio/components/StudioControls.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { SkipBack, Play, Pause, RotateCw, Download, Sliders } from 'lucide-react';
import { useStudioStore } from '@/stores/studioStore';
import { useStemExporter } from '../hooks/useStemExporter';

/**
 * StudioControls
 *
 * Displays the main player controls at the bottom of the screen,
 * including play/pause, rewind, restart, and export options.
 * It connects to the useStudioStore to manage playback state and
 * useStemExporter for downloading stems.
 *
 * @returns {JSX.Element} The rendered controls component.
 */
const StudioControls: React.FC = () => {
  const { isPlaying, togglePlay } = useStudioStore();
  const { downloadAllStems } = useStemExporter();

  return (
    <footer className="glass border-t border-white/5 px-6 py-6 pb-8 z-30 fixed bottom-0 w-full">
      <div className="flex items-center justify-between gap-6 max-w-screen-xl mx-auto">
        {/* Left */}
        <div className="flex items-center gap-4 w-1/3">
          <Button
            variant="ghost"
            size="icon"
            className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-white/5 rounded-md"
          >
            <Sliders className="w-4 h-4" />
          </Button>
          <div className="hidden sm:flex flex-col">
            <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">
              Master
            </span>
            <div className="flex gap-0.5 h-2 items-end mt-1">
              <div className="w-0.5 h-full bg-violet-500 rounded-full"></div>
              <div className="w-0.5 h-3/4 bg-violet-500 rounded-full"></div>
              <div className="w-0.5 h-full bg-violet-500 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Center */}
        <div className="flex items-center gap-6 justify-center w-1/3">
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white transition-colors">
            <SkipBack className="w-5 h-5 fill-current" />
          </Button>
          <Button
            onClick={togglePlay}
            variant="default"
            size="icon"
            className="w-12 h-12 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.15)]"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="text-neutral-400 hover:text-white transition-colors">
            <RotateCw className="w-5 h-5" />
          </Button>
        </div>

        {/* Right */}
        <div className="flex items-center justify-end gap-4 w-1/3">
          <div className="hidden sm:block text-right">
            <div className="text-xs font-medium text-white">Export Mix</div>
            <div className="text-[10px] text-neutral-500">WAV • 24bit</div>
          </div>
          <Button
            onClick={downloadAllStems}
            variant="secondary"
            size="icon"
            className="p-2.5 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white transition-colors border border-white/10"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </footer>
  );
};

export default StudioControls;
