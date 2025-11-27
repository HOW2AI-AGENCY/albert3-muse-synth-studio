/**
 * @file FullScreenPlayerMobile.tsx
 * @description An immersive, gesture-driven, and visually rich full-screen player for mobile.
 * @version 2.0.0
 */
import { memo } from 'react';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentTrack } from '@/stores/audioPlayerStore';
import { useSwipeGesture } from '@/hooks/useSwipeGesture';
import { useTrackQuery } from '@/hooks/tracks/useTracksQuery';
import { PlayerControls } from '../shared/PlayerControls';
import { ProgressBar } from '../shared/ProgressBar';
import { LyricsPanel } from '../shared/LyricsPanel';
import { LyricsSkeleton } from '../LyricsSkeleton';

interface FullScreenPlayerMobileProps {
  onMinimize: () => void;
}

const FullScreenPlayerMobileComponent = ({ onMinimize }: FullScreenPlayerMobileProps) => {
  const currentTrack = useCurrentTrack();
  const { data: fullTrack, isLoading } = useTrackQuery(currentTrack?.id || null);

  const swipeRef = useSwipeGesture({
    onSwipeDown: onMinimize,
  });

  if (!currentTrack) return null;

  const displayTrack = fullTrack || currentTrack;

  return (
    <div
      data-testid="fullscreen-player-mobile"
      ref={swipeRef as any}
      className="fixed inset-0 bg-background flex flex-col overflow-hidden animate-fade-in-fast"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        zIndex: 'var(--z-fullscreen-player, 100)',
      }}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={displayTrack.cover_url || '/placeholder.svg'}
          alt="background"
          className="w-full h-full object-cover blur-3xl scale-125 opacity-30"
          decoding="async"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
      </div>

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <header className="flex items-center justify-between p-4 flex-shrink-0">
          <Button variant="ghost" size="icon" onClick={onMinimize} aria-label="Minimize player">
            <ChevronDown className="h-6 w-6" />
          </Button>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">PLAYING FROM LIBRARY</p>
            <h2 className="text-sm font-semibold truncate">{displayTrack.title}</h2>
          </div>
          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreVertical className="h-6 w-6" />
          </Button>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col justify-center items-center px-6 pt-4 pb-0">
          {/* Cover Art */}
          <div className="relative w-full max-w-xs aspect-square shadow-2xl shadow-primary/10 rounded-lg">
            <img
              src={displayTrack.cover_url || '/placeholder.svg'}
              alt={displayTrack.title}
              className="w-full h-full object-cover rounded-lg transition-transform duration-700 ease-in-out"
              style={{ willChange: 'transform' }}
              onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.svg'; }}
            />
          </div>

          {/* Track Info */}
          <div className="w-full text-left mt-6">
            <h1 className="text-2xl font-bold">{displayTrack.title}</h1>
            <p className="text-muted-foreground">{displayTrack.style_tags?.join(', ') || 'AI Music'}</p>
          </div>

          <div className="w-full mt-4">
             <ProgressBar />
          </div>

          <div className="w-full mt-2">
            <PlayerControls />
          </div>
        </main>

        {/* Lyrics */}
        {/* ✅ FIX: Added pb-safe and overflow-auto for proper safe area handling on notched devices (CRITICAL) */}
        <footer className="h-48 flex-shrink-0 overflow-auto pb-safe">
          {isLoading ? (
            <LyricsSkeleton />
          ) : fullTrack ? (
            <LyricsPanel track={fullTrack as any} />
          ) : null}
        </footer>
      </div>
    </div>
  );
};

export const FullScreenPlayerMobile = memo(FullScreenPlayerMobileComponent);
