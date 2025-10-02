import { 
  MusicGeneratorLazy as MusicGenerator,
  TracksListLazy as TracksList,
  DetailPanelLazy as DetailPanel
} from "@/components/LazyComponents";
import { useState } from "react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus, Menu } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";

const Generate = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMobile = useIsMobile();

  const handleTrackGenerated = () => {
    setRefreshTrigger((prev) => prev + 1);
    setShowGenerator(false);
  };

  const handleTrackSelect = (track: {
    id: string;
    title: string;
    prompt: string;
    audio_url?: string;
    cover_url?: string;
    status: string;
    created_at: string;
    duration?: number;
    style_tags?: string[];
    lyrics?: string;
  }) => {
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

  // Mobile: Optimized layout with Drawer for generator
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] pb-20 relative">
      {/* Track List - Full Screen */}
      <div className="flex-1 overflow-auto p-4">
        <TracksList
          refreshTrigger={refreshTrigger}
          onTrackSelect={handleTrackSelect}
          selectedTrackId={selectedTrack?.id}
        />
      </div>

      {/* Floating Action Button */}
      <Drawer open={showGenerator} onOpenChange={setShowGenerator}>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className="fixed bottom-24 right-4 h-14 w-14 rounded-full shadow-2xl glow-primary bg-gradient-primary hover:scale-110 transition-all z-40 animate-pulse-glow"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[85vh] p-0">
          <div className="overflow-auto p-4">
            <MusicGenerator onTrackGenerated={handleTrackGenerated} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Detail Sheet (Mobile) */}
      <Sheet open={!!selectedTrack} onOpenChange={(open) => !open && handleCloseDetail()}>
        <SheetContent 
          side="bottom" 
          className="h-[90vh] rounded-t-2xl p-0 animate-slide-up"
        >
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
