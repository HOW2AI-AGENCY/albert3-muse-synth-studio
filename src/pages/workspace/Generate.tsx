import { useState, useEffect, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { MusicGeneratorV2 } from "@/components/MusicGeneratorV2";
import { TracksList } from "@/components/TracksList";
const DetailPanel = lazy(() => import("@/features/tracks/ui/DetailPanel").then(m => ({ default: m.DetailPanel })));
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "@/utils/iconImports";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Portal } from "@/components/ui/Portal";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useTracks } from "@/hooks/useTracks";
import { useTrackSync } from "@/hooks/useTrackSync";
import { useTrackRecovery } from "@/hooks/useTrackRecovery";
import { supabase } from "@/integrations/supabase/client";
import { normalizeTrack } from "@/utils/trackNormalizer";
import type { Track } from "@/services/api.service";
import { TrackDialogsManager } from "@/components/tracks/TrackDialogsManager";

const Generate = () => {
  const { tracks, isLoading, deleteTrack, refreshTracks } = useTracks();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();

  // Dialog states
  const [separateStemsOpen, setSeparateStemsOpen] = useState(false);
  const [selectedTrackForStems, setSelectedTrackForStems] = useState<{ id: string; title: string } | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [selectedTrackForExtend, setSelectedTrackForExtend] = useState<Track | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [selectedTrackForCover, setSelectedTrackForCover] = useState<{ id: string; title: string } | null>(null);

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

  const handleSeparateStems = (trackId: string) => {
    const t = tracks.find(tr => tr.id === trackId);
    if (!t) return;
    setSelectedTrackForStems({ id: t.id, title: t.title });
    setSeparateStemsOpen(true);
  };

  const handleExtend = (trackId: string) => {
    const t = tracks.find(tr => tr.id === trackId);
    if (!t) return;
    setSelectedTrackForExtend(t);
    setExtendOpen(true);
  };

  const handleCover = (trackId: string) => {
    const t = tracks.find(tr => tr.id === trackId);
    if (!t) return;
    setSelectedTrackForCover({ id: t.id, title: t.title });
    setCoverOpen(true);
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
              <MusicGeneratorV2 onTrackGenerated={handleTrackGenerated} />
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
                onSeparateStems={handleSeparateStems}
                onExtend={handleExtend}
                onCover={handleCover}
                onSelect={setSelectedTrack}
              />
            </div>
          </ResizablePanel>

          {selectedTrack && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={25} maxSize={40}>
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <DetailPanel
                    track={normalizeTrack(selectedTrack)}
                    onClose={handleCloseDetail}
                    onUpdate={refreshTracks}
                    onDelete={handleDelete}
                  />
                </Suspense>
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>

        <TrackDialogsManager
          separateStemsOpen={separateStemsOpen}
          setSeparateStemsOpen={setSeparateStemsOpen}
          selectedTrackForStems={selectedTrackForStems}
          setSelectedTrackForStems={setSelectedTrackForStems}
          extendOpen={extendOpen}
          setExtendOpen={setExtendOpen}
          selectedTrackForExtend={selectedTrackForExtend}
          coverOpen={coverOpen}
          setCoverOpen={setCoverOpen}
          selectedTrackForCover={selectedTrackForCover}
          onSuccess={refreshTracks}
        />
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
              <MusicGeneratorV2 onTrackGenerated={handleTrackGenerated} />
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
                onSeparateStems={handleSeparateStems}
                onExtend={handleExtend}
                onCover={handleCover}
                onSelect={setSelectedTrack}
              />
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>

        <TrackDialogsManager
          separateStemsOpen={separateStemsOpen}
          setSeparateStemsOpen={setSeparateStemsOpen}
          selectedTrackForStems={selectedTrackForStems}
          setSelectedTrackForStems={setSelectedTrackForStems}
          extendOpen={extendOpen}
          setExtendOpen={setExtendOpen}
          selectedTrackForExtend={selectedTrackForExtend}
          coverOpen={coverOpen}
          setCoverOpen={setCoverOpen}
          selectedTrackForCover={selectedTrackForCover}
          onSuccess={refreshTracks}
        />

        <Sheet open={!!selectedTrack} onOpenChange={(open) => !open && handleCloseDetail()}>
          <SheetContent side="right" className="w-full sm:w-[500px] p-0 border-l">
            {selectedTrack && (
              <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                <DetailPanel
                  track={normalizeTrack(selectedTrack)}
                  onClose={handleCloseDetail}
                  onUpdate={refreshTracks}
                  onDelete={handleDelete}
                />
              </Suspense>
            )}
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  // Mobile: List with FAB and Drawers
  return (
    <div className="h-full bg-background flex flex-col">
      <div className="flex-1 overflow-y-auto workspace-main p-4 pb-24">
        <TracksList
          tracks={tracks}
          isLoading={isLoading}
          deleteTrack={deleteTrack}
          refreshTracks={refreshTracks}
          onSeparateStems={handleSeparateStems}
          onExtend={handleExtend}
          onCover={handleCover}
          onSelect={setSelectedTrack}
        />
      </div>

      <TrackDialogsManager
        separateStemsOpen={separateStemsOpen}
        setSeparateStemsOpen={setSeparateStemsOpen}
        selectedTrackForStems={selectedTrackForStems}
        setSelectedTrackForStems={setSelectedTrackForStems}
        extendOpen={extendOpen}
        setExtendOpen={setExtendOpen}
        selectedTrackForExtend={selectedTrackForExtend}
        coverOpen={coverOpen}
        setCoverOpen={setCoverOpen}
        selectedTrackForCover={selectedTrackForCover}
        onSuccess={refreshTracks}
      />

      <Portal>
        <TooltipProvider>
          <Drawer open={showGenerator} onOpenChange={setShowGenerator}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DrawerTrigger asChild>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Button
                      size="lg"
                      className="fixed right-4 bottom-4 h-14 w-14 rounded-full shadow-lg glow-primary-strong bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary z-50"
                      style={{ 
                        bottom: 'calc(var(--bottom-tab-bar-height) + 1rem)'
                      }}
                      aria-label="Создать музыку"
                    >
                      <Plus className="h-6 w-6" />
                    </Button>
                  </motion.div>
                </DrawerTrigger>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-sm font-medium">Создать музыку</p>
              </TooltipContent>
            </Tooltip>
            <DrawerContent className="h-[90vh] mt-20" aria-describedby={undefined}>
              <div className="w-full max-w-md mx-auto h-8 flex items-center justify-center">
                <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
              </div>
              <div className="p-4 h-full overflow-y-auto">
                <MusicGeneratorV2 onTrackGenerated={handleTrackGenerated} />
              </div>
            </DrawerContent>
          </Drawer>
        </TooltipProvider>
      </Portal>

      <Drawer open={!!selectedTrack} onOpenChange={(open) => !open && handleCloseDetail()}>
        <DrawerContent className="h-[70vh] max-h-[75vh]" aria-describedby={undefined}>
          {/* Drag handle */}
          <div className="w-full h-8 flex items-center justify-center shrink-0">
            <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
          </div>
          
          {selectedTrack && (
            <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
              <DetailPanel
                track={normalizeTrack(selectedTrack)}
                onClose={handleCloseDetail}
                onUpdate={refreshTracks}
                onDelete={handleDelete}
                variant="mobile"
              />
            </Suspense>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Generate;