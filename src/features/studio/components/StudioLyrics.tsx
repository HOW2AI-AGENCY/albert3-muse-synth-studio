// src/features/studio/components/StudioLyrics.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { AlignLeft } from 'lucide-react';

/**
 * StudioLyrics
 *
 * Displays the synchronized lyrics for the track, with the active word highlighted.
 * Includes a button to regenerate a segment of the lyrics.
 *
 * @returns {JSX.Element} The rendered lyrics component.
 */
const StudioLyrics: React.FC = () => {
  return (
    <section className="px-5 py-4 border-b border-white/5 bg-neutral-950/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <AlignLeft className="text-violet-400 w-4 h-4" />
          <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
            Synchronized Lyrics
          </h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 px-2 py-1 bg-violet-500/10 hover:bg-violet-500/20 border-violet-500/20 rounded text-[10px] font-medium text-violet-300 transition-colors group"
        >
          <Sparkles className="w-3 h-3 group-hover:text-violet-200" />
          Regenerate Segment
        </Button>
      </div>
      <div className="w-full p-4 rounded-lg bg-black/40 border border-white/5 flex flex-wrap gap-x-2 gap-y-1.5 font-mono text-sm text-neutral-500 relative overflow-hidden leading-relaxed">
        {/* Active Word Indicator */}
        <span className="text-white font-semibold relative cursor-pointer select-none">
          Neon
          <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.8)]"></span>
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          lights
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          flicker
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          in
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          the
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          rain
        </span>
        <span className="w-full h-0 basis-full"></span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          Shadows
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          dancing
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          down
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          the
        </span>
        <span className="hover:text-neutral-200 cursor-pointer transition-colors duration-200 select-none">
          lane
        </span>
      </div>
    </section>
  );
};

export default StudioLyrics;
