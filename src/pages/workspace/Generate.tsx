import { MusicGenerator } from "@/components/MusicGenerator";
import { TracksList } from "@/components/TracksList";
import { DetailPanel } from "@/components/workspace/DetailPanel";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const Generate = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const handleTrackGenerated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTrackSelect = (track: any) => {
    setSelectedTrack(track);
  };

  const handleCloseDetail = () => {
    setSelectedTrack(null);
  };

  const handleUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleDelete = () => {
    setRefreshTrigger((prev) => prev + 1);
    setSelectedTrack(null);
  };

  // Desktop: 3-panel resizable layout
  if (isDesktop) {
    return (
      <div className="h-[calc(100vh-4rem)]">
        <ResizablePanelGroup direction="horizontal">
          {/* Create Panel */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full overflow-auto p-4">
              <MusicGenerator onTrackGenerated={handleTrackGenerated} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Track List */}
          <ResizablePanel defaultSize={selectedTrack ? 50 : 80} minSize={40}>
            <div className="h-full overflow-auto p-4">
              <TracksList
                refreshTrigger={refreshTrigger}
                onTrackSelect={handleTrackSelect}
                selectedTrackId={selectedTrack?.id}
              />
            </div>
          </ResizablePanel>

          {/* Detail Panel */}
          {selectedTrack && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                <DetailPanel
                  track={selectedTrack}
                  onClose={handleCloseDetail}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    );
  }

  // Mobile/Tablet: Stack layout with Sheet for details
  return (
    <div className="flex flex-col lg:flex-row gap-4 p-4 md:p-6 h-[calc(100vh-4rem)]">
      {/* Create Panel */}
      <div className="w-full lg:w-80 shrink-0">
        <MusicGenerator onTrackGenerated={handleTrackGenerated} />
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-auto">
        <TracksList
          refreshTrigger={refreshTrigger}
          onTrackSelect={handleTrackSelect}
          selectedTrackId={selectedTrack?.id}
        />
      </div>

      {/* Detail Sheet (Mobile) */}
      <Sheet open={!!selectedTrack} onOpenChange={(open) => !open && handleCloseDetail()}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {selectedTrack && (
            <DetailPanel
              track={selectedTrack}
              onClose={handleCloseDetail}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Generate;
