/**
 * Refactored Global Audio Player
 * Simplified using custom hooks and desktop components
 */
import { memo } from "react";
import { MiniPlayer } from "./MiniPlayer";
import { FullScreenPlayer } from "./FullScreenPlayer";
import { AudioController } from "./AudioController";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentTrack } from "@/stores/audioPlayerStore";
import { usePlayerVisibility } from "./hooks";
import { DesktopPlayerLayout } from "./desktop/DesktopPlayerLayout";

const GlobalAudioPlayer = memo(() => {
  const currentTrack = useCurrentTrack();
  const isMobile = useIsMobile();
  
  const { isExpanded, setIsExpanded } = usePlayerVisibility(currentTrack);

  if (!currentTrack || !currentTrack.audio_url) {
    return null;
  }

  // Mobile: mini + fullscreen player
  if (isMobile) {
    return (
      <>
        <AudioController />
        {isExpanded ? (
          <FullScreenPlayer onMinimize={() => setIsExpanded(false)} />
        ) : (
          <MiniPlayer onExpand={() => setIsExpanded(true)} />
        )}
      </>
    );
  }

  // Desktop: refactored layout
  return (
    <>
      <AudioController />
      <DesktopPlayerLayout track={currentTrack} />
    </>
  );
});

GlobalAudioPlayer.displayName = 'GlobalAudioPlayer';

export default GlobalAudioPlayer;
