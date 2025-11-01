import { 
  LazySeparateStemsDialog, 
  LazyExtendTrackDialog, 
  LazyCreateCoverDialog,
  LazyCreatePersonaDialog
} from "@/components/LazyDialogs";
import type { Track } from "@/services/api.service";

interface TrackDialogsManagerProps {
  // Stems Dialog
  separateStemsOpen: boolean;
  setSeparateStemsOpen: (open: boolean) => void;
  selectedTrackForStems: { id: string; title: string } | null;
  setSelectedTrackForStems: (track: { id: string; title: string } | null) => void;
  
  // Extend Dialog
  extendOpen: boolean;
  setExtendOpen: (open: boolean) => void;
  selectedTrackForExtend: Track | null;
  
  // Cover Dialog
  coverOpen: boolean;
  setCoverOpen: (open: boolean) => void;
  selectedTrackForCover: { id: string; title: string } | null;
  
  // Persona Dialog
  createPersonaOpen: boolean;
  setCreatePersonaOpen: (open: boolean) => void;
  selectedTrackForPersona: Track | null;
  
  // Callbacks
  onSuccess: () => void;
}

export function TrackDialogsManager({
  separateStemsOpen,
  setSeparateStemsOpen,
  selectedTrackForStems,
  setSelectedTrackForStems,
  extendOpen,
  setExtendOpen,
  selectedTrackForExtend,
  coverOpen,
  setCoverOpen,
  selectedTrackForCover,
  createPersonaOpen,
  setCreatePersonaOpen,
  selectedTrackForPersona,
  onSuccess,
}: TrackDialogsManagerProps) {
  return (
    <>
      {separateStemsOpen && selectedTrackForStems && (
        <LazySeparateStemsDialog
          open={separateStemsOpen}
          onOpenChange={setSeparateStemsOpen}
          trackId={selectedTrackForStems.id}
          trackTitle={selectedTrackForStems.title}
          onSuccess={() => {
            onSuccess();
            setSelectedTrackForStems(null);
          }}
        />
      )}
      
      {extendOpen && selectedTrackForExtend && (
        <LazyExtendTrackDialog
          open={extendOpen}
          onOpenChange={setExtendOpen}
          track={{
            id: selectedTrackForExtend.id,
            title: selectedTrackForExtend.title,
            duration: selectedTrackForExtend.duration ?? undefined,
            prompt: selectedTrackForExtend.prompt,
            style_tags: selectedTrackForExtend.style_tags as any,
          }}
        />
      )}
      
      {coverOpen && selectedTrackForCover && (
        <LazyCreateCoverDialog
          open={coverOpen}
          onOpenChange={setCoverOpen}
          track={{
            id: selectedTrackForCover.id,
            title: selectedTrackForCover.title,
          }}
        />
      )}
      
      {createPersonaOpen && selectedTrackForPersona && (
        <LazyCreatePersonaDialog
          open={createPersonaOpen}
          onOpenChange={setCreatePersonaOpen}
          track={{
            id: selectedTrackForPersona.id,
            title: selectedTrackForPersona.title,
            prompt: selectedTrackForPersona.prompt,
            improved_prompt: selectedTrackForPersona.improved_prompt,
            cover_url: selectedTrackForPersona.cover_url,
            style_tags: selectedTrackForPersona.style_tags as any,
            ai_description: (selectedTrackForPersona.metadata as any)?.ai_description,
            metadata: selectedTrackForPersona.metadata as any,
          }}
          onSuccess={() => {
            onSuccess();
            setCreatePersonaOpen(false);
          }}
        />
      )}
    </>
  );
}
