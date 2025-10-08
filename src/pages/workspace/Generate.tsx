import { 
  MusicGeneratorLazy as MusicGenerator,
  TracksListLazy as TracksList,
  DetailPanelLazy as DetailPanel
} from "@/components/LazyComponents";
import { useState, useEffect, useRef } from "react";
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
import { useTracks } from "@/hooks/useTracks";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";

const Generate = () => {
  const { tracks, isLoading, deleteTrack, refreshTracks } = useTracks();
  const { currentTrack } = useAudioPlayer();
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const initialTrackCount = useRef(tracks.length);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMobile = useIsMobile();

  const handleTrackGenerated = () => {
    setShowGenerator(false);
    if (pollingRef.current) clearInterval(pollingRef.current);

    initialTrackCount.current = tracks.length;
    setIsPolling(true);

    // Start polling, but clear any existing timers first
    pollingRef.current = setInterval(() => {
      refreshTracks();
    }, 2500); // Poll every 2.5 seconds
  };

  useEffect(() => {
    if (!isPolling) return;

    // Stop polling if a new track has been added
    if (tracks.length > initialTrackCount.current) {
      const newTrack = tracks.find(t => !tracks.slice(initialTrackCount.current).some(it => it.id === t.id));
      if(newTrack || tracks.some(t => t.status === 'processing')) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        setIsPolling(false);
      }
    }

    // Failsafe timeout after 1 minute
    const timeout = setTimeout(() => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      setIsPolling(false);
    }, 60000);

    return () => {
      clearTimeout(timeout);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [tracks, isPolling, initialTrackCount]);

  const handleTrackSelect = (track: any) => {
    setSelectedTrack(track);
  };

  const handleCloseDetail = () => {
    setSelectedTrack(null);
  };

  const handleDelete = async () => {
    if (selectedTrack?.id) {
      await deleteTrack(selectedTrack.id);
      setSelectedTrack(null);
    }
  };

  // Desktop: 3-panel resizable layout
  if (isDesktop) {
    return (
      <div className="h-[calc(100vh-4rem)] p-4">
        <ResizablePanelGroup direction="horizontal" className="rounded-lg border border-border overflow-hidden">
          {/* Create Panel */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full overflow-auto">
              <MusicGenerator onTrackGenerated={handleTrackGenerated} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle className="hover:bg-primary/20 transition-colors" />

          {/* Track List */}
          <ResizablePanel defaultSize={selectedTrack ? 50 : 80} minSize={40}>
            <div className="h-full overflow-auto">
              <TracksList
                tracks={tracks}
                isLoading={isLoading}
                deleteTrack={deleteTrack}
                refreshTracks={refreshTracks}
                onTrackSelect={handleTrackSelect}
                selectedTrackId={selectedTrack?.id}
              />
            </div>
          </ResizablePanel>

          {/* Detail Panel */}
          {selectedTrack && (
            <>
              <ResizableHandle withHandle className="hover:bg-primary/20 transition-colors" />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                <DetailPanel
                  track={selectedTrack}
                  onClose={handleCloseDetail}
                  onUpdate={refreshTracks}
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
    <div className="flex flex-col h-full relative">
      {/* Track List - Full Screen */}
      <div className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ${currentTrack ? 'pb-24' : 'pb-4'}`}>
        <TracksList
          tracks={tracks}
          isLoading={isLoading}
          deleteTrack={deleteTrack}
          refreshTracks={refreshTracks}
          onTrackSelect={handleTrackSelect}
          selectedTrackId={selectedTrack?.id}
        />
      </div>

      {/* Floating Action Button - Right Side Mobile */}
      <Drawer open={showGenerator} onOpenChange={setShowGenerator}>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className={`fixed right-4 h-14 w-14 rounded-full shadow-2xl glow-primary bg-gradient-primary hover:scale-110 transition-all duration-300 z-40 animate-pulse-glow ${currentTrack ? 'bottom-24' : 'bottom-8'}`}
            aria-label="Создать музыку"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[90vh] p-0">
          <div className="overflow-auto p-4 max-w-2xl mx-auto w-full">
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
              onUpdate={refreshTracks}
              onDelete={handleDelete}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default Generate;
