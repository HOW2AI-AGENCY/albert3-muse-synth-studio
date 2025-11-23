// src/features/studio/components/StudioHeader.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Share2 } from 'lucide-react';

/**
 * StudioHeader
 *
 * Displays the header for the Stem Studio, including navigation,
 * project title, and a share button.
 *
 * @returns {JSX.Element} The rendered header component.
 */
const StudioHeader: React.FC = () => {
  return (
    <header className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-black/80 backdrop-blur-md z-20">
      <Button variant="ghost" size="icon" className="p-2 -ml-2 hover:bg-white/5 rounded-full transition-colors">
        <ChevronLeft className="text-neutral-400 w-6 h-6" />
      </Button>
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-widest">
          Project
        </span>
        <h1 className="text-sm font-semibold text-white tracking-tight">
          Cyberpunk Neon v3
        </h1>
      </div>
      <Button variant="ghost" size="icon" className="p-2 -mr-2 hover:bg-white/5 rounded-full transition-colors text-violet-400">
        <Share2 className="w-5 h-5" />
      </Button>
    </header>
  );
};

export default StudioHeader;
