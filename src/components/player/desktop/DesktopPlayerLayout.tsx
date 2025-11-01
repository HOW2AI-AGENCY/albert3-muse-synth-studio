/**
 * Desktop player layout container
 */
import { memo, useRef } from 'react';
import { cn } from '@/lib/utils';

interface DesktopPlayerLayoutProps {
  isVisible: boolean;
  children: React.ReactNode;
}

export const DesktopPlayerLayout = memo(({ isVisible, children }: DesktopPlayerLayoutProps) => {
  const playerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={playerRef}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[60] transition-all duration-500 ease-out",
        isVisible 
          ? 'translate-y-0 opacity-100' 
          : 'translate-y-full opacity-0'
      )}
    >
      {/* Background blur and gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/90 to-background/80 backdrop-blur-xl" />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5" />
      
      {/* Top border with glow effect */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-px bg-primary/80 shadow-glow-primary animate-pulse" />
      
      <div className="relative container mx-auto px-4 py-4">
        {children}
      </div>
    </div>
  );
});

DesktopPlayerLayout.displayName = 'DesktopPlayerLayout';
