/**
 * Container для AI-операций над треками
 * Mureka features removed - only Suno is supported
 */

export const AITrackActionsContainer = ({ 
  children 
}: { 
  children: (handlers: { 
    onDescribeTrack: (trackId: string) => void; 
    onRecognizeTrack: (trackId: string) => void; 
  }) => React.ReactNode 
}) => {
  // Mureka features removed - stubs only
  return (
    <>
      {children({
        onDescribeTrack: () => {},
        onRecognizeTrack: () => {},
      })}
    </>
  );
};
