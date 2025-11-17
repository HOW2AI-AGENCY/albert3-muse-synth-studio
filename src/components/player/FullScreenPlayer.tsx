/**
 * Refactored Full Screen Player
 * Routes to mobile or desktop version based on viewport
 */

import { memo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCurrentTrack } from "@/stores/audioPlayerStore";
import { FullScreenPlayerMobile } from "./fullscreen/FullScreenPlayerMobile";
import { FullScreenPlayerDesktop } from "./fullscreen/FullScreenPlayerDesktop";

interface FullScreenPlayerProps {
  onMinimize: () => void;
}

export const FullScreenPlayer = memo(({ onMinimize }: FullScreenPlayerProps) => {
  const currentTrack = useCurrentTrack();
  const isMobile = useIsMobile();

  if (!currentTrack) return null;

  // Render mobile or desktop version based on viewport
  return isMobile ? (
    <FullScreenPlayerMobile onMinimize={onMinimize} />
  ) : (
    <FullScreenPlayerDesktop onMinimize={onMinimize} />
  );
});

FullScreenPlayer.displayName = 'FullScreenPlayer';
