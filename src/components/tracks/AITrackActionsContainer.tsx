/**
 * Container для AI-операций над треками
 * Управляет диалогами описания и распознавания
 */

import { useState } from 'react';
import { TrackDescriptionDialog } from '@/components/mureka/TrackDescriptionDialog';
import { SongRecognitionDialog } from '@/components/mureka/SongRecognitionDialog';

interface AITrackActionsContainerProps {
  children: (handlers: {
    onDescribeTrack: (trackId: string) => void;
    onRecognizeTrack: (trackId: string) => void;
  }) => React.ReactNode;
}

export const AITrackActionsContainer = ({ children }: AITrackActionsContainerProps) => {
  const [descriptionDialogState, setDescriptionDialogState] = useState<{
    open: boolean;
    trackId: string | null;
    trackTitle: string | null;
  }>({
    open: false,
    trackId: null,
    trackTitle: null,
  });

  const [recognitionDialogState, setRecognitionDialogState] = useState<{
    open: boolean;
    trackId: string | null;
  }>({
    open: false,
    trackId: null,
  });

  const handleDescribeTrack = (trackId: string) => {
    setDescriptionDialogState({
      open: true,
      trackId,
      trackTitle: null,
    });
  };

  const handleRecognizeTrack = (trackId: string) => {
    setRecognitionDialogState({
      open: true,
      trackId,
    });
  };

  return (
    <>
      {children({
        onDescribeTrack: handleDescribeTrack,
        onRecognizeTrack: handleRecognizeTrack,
      })}

      {/* AI Description Dialog */}
      {descriptionDialogState.trackId && (
        <TrackDescriptionDialog
          open={descriptionDialogState.open}
          onOpenChange={(open) =>
            setDescriptionDialogState((prev) => ({ ...prev, open }))
          }
          trackId={descriptionDialogState.trackId}
          trackTitle={descriptionDialogState.trackTitle || undefined}
        />
      )}

      {/* Song Recognition Dialog */}
      {recognitionDialogState.trackId && (
        <SongRecognitionDialog
          open={recognitionDialogState.open}
          onOpenChange={(open) =>
            setRecognitionDialogState((prev) => ({ ...prev, open }))
          }
          trackId={recognitionDialogState.trackId}
        />
      )}
    </>
  );
};
