import { useState } from "react";
import { LazyExtendTrackDialog, LazyCreateCoverDialog, LazyCreatePersonaDialog } from "@/components/LazyDialogs";

interface Track {
  id: string;
  title: string;
  duration?: number;
  prompt?: string;
  improved_prompt?: string;
  style_tags?: string[];
  cover_url?: string | null;
  ai_description?: string | null;
  metadata?: Record<string, any> | null;
}

interface GenerateWithDialogsProps {
  children: (props: {
    handleExtend: (trackId: string) => void;
    handleCover: (trackId: string) => void;
    handleCreatePersona: (trackId: string) => void;
  }) => React.ReactNode;
  tracks: Track[];
}

export function GenerateWithDialogs({ children, tracks }: GenerateWithDialogsProps) {
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [createPersonaDialogOpen, setCreatePersonaDialogOpen] = useState(false);
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

  const handleCreatePersona = (trackId: string) => {
    const track = tracks.find(t => t.id === trackId);
    if (track) {
      setSelectedTrack(track);
      setCreatePersonaDialogOpen(true);
    }
  };

  return (
    <>
      {children({ handleExtend, handleCover, handleCreatePersona })}
      
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
      
      {createPersonaDialogOpen && selectedTrack && (
        <LazyCreatePersonaDialog
          open={createPersonaDialogOpen}
          onOpenChange={setCreatePersonaDialogOpen}
          track={{
            id: selectedTrack.id,
            title: selectedTrack.title,
            prompt: selectedTrack.prompt,
            improved_prompt: selectedTrack.improved_prompt,
            cover_url: selectedTrack.cover_url,
            style_tags: selectedTrack.style_tags,
            metadata: selectedTrack.metadata,
          }}
          onSuccess={() => {
            setCreatePersonaDialogOpen(false);
          }}
        />
      )}
    </>
  );
}