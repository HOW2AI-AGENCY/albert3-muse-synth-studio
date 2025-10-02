import { useEffect } from 'react';

interface Track {
  title: string;
  artist?: string;
  album?: string;
  artwork?: Array<{ src: string; sizes: string; type: string }>;
}

interface MediaSessionHandlers {
  onPlay?: () => void;
  onPause?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  onSeek?: (time: number) => void;
}

export const useMediaSession = (track: Track | null, handlers: MediaSessionHandlers) => {
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || 'Unknown Artist',
      album: track.album || 'Unknown Album',
      artwork: track.artwork || [],
    });

    const actionHandlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [];

    if (handlers.onPlay) {
      actionHandlers.push(['play', handlers.onPlay]);
    }
    if (handlers.onPause) {
      actionHandlers.push(['pause', handlers.onPause]);
    }
    if (handlers.onPrevious) {
      actionHandlers.push(['previoustrack', handlers.onPrevious]);
    }
    if (handlers.onNext) {
      actionHandlers.push(['nexttrack', handlers.onNext]);
    }
    if (handlers.onSeek) {
      actionHandlers.push([
        'seekto',
        (details) => {
          if (details.seekTime !== undefined) {
            handlers.onSeek!(details.seekTime);
          }
        },
      ]);
    }

    actionHandlers.forEach(([action, handler]) => {
      try {
        navigator.mediaSession.setActionHandler(action, handler);
      } catch (error) {
        console.warn(`The media session action "${action}" is not supported.`);
      }
    });

    return () => {
      actionHandlers.forEach(([action]) => {
        try {
          navigator.mediaSession.setActionHandler(action, null);
        } catch (error) {
          // Ignore cleanup errors
        }
      });
    };
  }, [track, handlers]);
};
