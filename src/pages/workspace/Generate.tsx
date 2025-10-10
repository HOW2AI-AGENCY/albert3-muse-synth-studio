import { useState, useEffect } from "react";
import { 
  MusicGeneratorLazy as MusicGenerator,
  TracksListLazy as TracksList,
  DetailPanelLazy as DetailPanel
} from "@/components/LazyComponents";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useTracks } from "@/hooks/useTracks";
import { useTrackSync } from "@/hooks/useTrackSync";
import { useTrackRecovery } from "@/hooks/useTrackRecovery";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { supabase } from "@/integrations/supabase/client";
import { normalizeTrack } from "@/utils/trackNormalizer";
import type { Track } from "@/services/api.service";

const Generate = () => {
  const { tracks, isLoading, deleteTrack, refreshTracks } = useTracks();
  const { currentTrack } = useAudioPlayer();
  const isPlayerVisible = !!currentTrack;
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  useTrackSync(userId, {
    onTrackCompleted: refreshTracks,
    onTrackFailed: refreshTracks,
    enabled: true,
  });

  useTrackRecovery(userId, refreshTracks, {
    enabled: true,
    checkIntervalMs: 60000,
    pendingThresholdMs: 120000,
  });

  const handleTrackGenerated = () => {
    if (!isDesktop) {
      setShowGenerator(false);
    }
    // Запускаем обновление, чтобы сразу увидеть 'processing' статус
    setTimeout(refreshTracks, 500);
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
      <div className="h-full p-4">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full rounded-lg border"
        >
          <ResizablePanel defaultSize={25} minSize={20} maxSize={35}>
            <div className="h-full p-1">
              <MusicGenerator onTrackGenerated={handleTrackGenerated} />
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={selectedTrack ? 45 : 75} minSize={30}>
            <div className="h-full overflow-y-auto p-4">
              <TracksList
                tracks={tracks}
                isLoading={isLoading}
                deleteTrack={deleteTrack}
                refreshTracks={refreshTracks}
              />
            </div>
          </ResizablePanel>

          {selectedTrack && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                <DetailPanel
                  track={normalizeTrack(selectedTrack)}
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

  // Tablet: 2-panel layout
  if (isTablet) {
    return (
      <div className="h-full p-4">
        <ResizablePanelGroup
          direction="horizontal"
          className="h-full rounded-lg border"
        >
          <ResizablePanel defaultSize={40} minSize={30} maxSize={50}>
            <div className="h-full p-1">
              <MusicGenerator onTrackGenerated={handleTrackGenerated} />
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={60} minSize={50}>
            <div className="h-full overflow-y-auto p-4">
              <TracksList
                tracks={tracks}
                isLoading={isLoading}
                deleteTrack={deleteTrack}
                refreshTracks={refreshTracks}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
        <Sheet open={!!selectedTrack} onOpenChange={(open) => !open && handleCloseDetail()}>
          <SheetContent side="right" className="w-full sm:w-[500px] p-0 border-l">
            {selectedTrack && (
              <DetailPanel
                track={normalizeTrack(selectedTrack)}
                onClose={handleCloseDetail}
                onUpdate={refreshTracks}
                onDelete={handleDelete}
              />
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Mobile: List with FAB and Drawers
  return (
    <div className="h-full">
      <div className="p-4 h-full overflow-y-auto pb-24">
        <TracksList
          tracks={tracks}
          isLoading={isLoading}
          deleteTrack={deleteTrack}
          refreshTracks={refreshTracks}
        />
      </div>

      <Drawer open={showGenerator} onOpenChange={setShowGenerator}>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className="fixed right-4 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90 transition-transform hover:scale-105 z-20"
            style={{ bottom: isPlayerVisible ? 'calc(5rem + 1rem)' : '1rem' }}
            aria-label="Создать музыку"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="h-[90vh] mt-20" aria-describedby={undefined}>
            <div className="p-4 h-full overflow-y-auto">
                <MusicGenerator onTrackGenerated={handleTrackGenerated} />
            </div>
        </DrawerContent>
      </Drawer>

      <Sheet open={!!selectedTrack} onOpenChange={(open) => !open && handleCloseDetail()}>
        <SheetContent side="bottom" className="h-[90vh] p-0 border-t">
          {selectedTrack && (
            <DetailPanel
              track={normalizeTrack(selectedTrack)}
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