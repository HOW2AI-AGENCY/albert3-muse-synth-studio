import { useState } from "react";
import { LazyExtendTrackDialog, LazyCreateCoverDialog } from "@/components/LazyDialogs";

interface Track {
  id: string;
  title: string;
  duration?: number;
  prompt?: string;
  style_tags?: string[];
}

interface GenerateWithDialogsProps {
  children: (props: {
    handleExtend: (trackId: string) => void;
    handleCover: (trackId: string) => void;
  }) => React.ReactNode;
  tracks: Track[];
}

export function GenerateWithDialogs({ children, tracks }: GenerateWithDialogsProps) {
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);

  const handleExtend = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      setSelectedTrack(track);
      setExtendDialogOpen(true);
    }
  };

  const handleCover = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      setSelectedTrack(track);
      setCoverDialogOpen(true);
    }
  };

  return (
    <>
      {children({ handleExtend, handleCover })}
      
      {extendDialogOpen && selectedTrack && (
        <LazyExtendTrackDialog
          open={extendDialogOpen}
          onOpenChange={setExtendDialogOpen}
          track={selectedTrack}
        />
      )}
      
      {coverDialogOpen && selectedTrack && (
        <LazyCreateCoverDialog
          open={coverDialogOpen}
          onOpenChange={setCoverDialogOpen}
          track={selectedTrack}
        />
      )}
    </>
  );
}