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
import { Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Skeleton } from "@/components/ui/skeleton";
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
import { logInfo } from "@/utils/logger";
import { normalizeTrack } from "@/utils/trackNormalizer";
import type { Track } from "@/services/api.service";

const Generate = () => {
  const { tracks, isLoading, deleteTrack, refreshTracks } = useTracks();
  const { currentTrack } = useAudioPlayer();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const initialTrackCount = useRef(tracks.length);
  const [userId, setUserId] = useState<string | undefined>();

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isMobile = useIsMobile();

  // Get current user for track sync
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id);
    };
    getUser();
  }, []);

  // Auto-sync tracks in real-time
  useTrackSync(userId, {
    onTrackCompleted: (trackId) => {
      logInfo('Track completed - refreshing list', 'Generate', { trackId });
      refreshTracks();
      setIsPolling(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    },
    onTrackFailed: (trackId, error) => {
      logInfo('Track failed - refreshing list', 'Generate', { trackId, error });
      refreshTracks();
      setIsPolling(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    },
    enabled: true,
  });

  // Auto-recovery for stuck tracks (треки в pending без suno_id)
  useTrackRecovery(userId, refreshTracks, {
    enabled: true,
    checkIntervalMs: 60000, // Проверять каждую минуту
    pendingThresholdMs: 120000, // Восстанавливать треки старше 2 минут
  });

  const handleTrackGenerated = () => {
    setShowGenerator(false);

    initialTrackCount.current = tracks.length;
    setIsPolling(true);

    if (pollingRef.current) {
      return;
    }

    // Start polling if no existing timer
    pollingRef.current = setInterval(() => {
      refreshTracks();
    }, 2500); // Poll every 2.5 seconds
  };

  useEffect(() => {
    if (!isPolling) return;

    const hasNewTrack =
      tracks.length > initialTrackCount.current &&
      tracks.slice(initialTrackCount.current).some((track) => Boolean(track));
    const hasProcessingTracks = tracks.some(t => t.status === 'processing');

    if (hasNewTrack || hasProcessingTracks) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsPolling(false);
    }

    // Failsafe timeout after 1 minute
    const timeout = setTimeout(() => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setIsPolling(false);
    }, 60000);

    return () => {
      clearTimeout(timeout);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [tracks, isPolling]);

  const handleTrackSelect = (track: Track) => {
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

  // Mobile: Optimized layout with Drawer for generator
  return (
    <div className="flex flex-col h-full relative">
      {/* Track List - Full Screen */}
      <div className={`flex-1 overflow-y-auto p-4 transition-all duration-300 ${currentTrack ? 'pb-24' : 'pb-4'}`}>
        {isPolling && (
          <div className="space-y-4 mb-4">
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        )}
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
            className={`fixed right-4 h-14 w-14 rounded-full shadow-2xl glow-primary bg-gradient-primary hover:scale-110 transition-all duration-300 z-40 animate-pulse-glow touch-action-manipulation`}
            style={{ bottom: currentTrack ? 'calc(env(safe-area-inset-bottom) + 88px)' : 'calc(env(safe-area-inset-bottom) + 16px)' }}
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
