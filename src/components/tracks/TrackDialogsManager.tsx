import { 
  LazySeparateStemsDialog, 
  LazyExtendTrackDialog, 
  LazyCreateCoverDialog 
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
    </>
  );
}
