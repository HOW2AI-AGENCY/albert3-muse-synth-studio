import { useState, Suspense, lazy } from "react";
import { motion } from "framer-motion";
import { MusicGeneratorV2 } from "@/components/MusicGeneratorV2";
import { TracksList } from "@/components/TracksList";
const DetailPanel = lazy(() => import("@/features/tracks/ui/DetailPanel").then(m => ({ default: m.DetailPanel })));
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "@/utils/iconImports";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { Portal } from "@/components/ui/Portal";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { useTracks } from "@/hooks/useTracks";
import { useTrackSync } from "@/hooks/useTrackSync";
import { useTrackRecovery } from "@/hooks/useTrackRecovery";
import { normalizeTrack } from "@/utils/trackNormalizer";
import type { Track } from "@/services/api.service";
import { TrackDialogsManager } from "@/components/tracks/TrackDialogsManager";
import { useMusicProjects } from "@/hooks/useMusicProjects";
import { useTrackOperations } from "@/hooks/tracks/useTrackOperations";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

const Generate = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>();
  const { userId } = useAuth();
  const {
    tracks,
    isLoading,
    deleteTrack,
    refreshTracks,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useTracks(undefined, {
    projectId: selectedProjectId,
    excludeDraftTracks: true,
    pageSize: 25,
  });
  const { projects } = useMusicProjects();
  const trackOperations = useTrackOperations();
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [showGenerator, setShowGenerator] = useState(false);

  // Dialog states
  const [separateStemsOpen, setSeparateStemsOpen] = useState(false);
  const [selectedTrackForStems, setSelectedTrackForStems] = useState<{ id: string; title: string } | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [selectedTrackForExtend, setSelectedTrackForExtend] = useState<Track | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [selectedTrackForCover, setSelectedTrackForCover] = useState<{ id: string; title: string } | null>(null);
  const [createPersonaOpen, setCreatePersonaOpen] = useState(false);
  const [selectedTrackForPersona, setSelectedTrackForPersona] = useState<Track | null>(null);

  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");

  useTrackSync(userId || undefined, {
    onTrackCompleted: refreshTracks,
    onTrackFailed: refreshTracks,
    enabled: true,
  });

  useTrackRecovery(userId || undefined, refreshTracks, {
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
    const t = tracks.find((tr: Track) => tr.id === trackId);
    if (!t) return;
    setSelectedTrackForStems({ id: t.id, title: t.title });
    setSeparateStemsOpen(true);
  };

  const handleExtend = (trackId: string) => {
    const t = tracks.find((tr: Track) => tr.id === trackId);
    if (!t) return;
    setSelectedTrackForExtend(t);
    setExtendOpen(true);
  };

  const handleCover = (trackId: string) => {
    const t = tracks.find((tr: Track) => tr.id === trackId);
    if (!t) return;
    setSelectedTrackForCover({ id: t.id, title: t.title });
    setCoverOpen(true);
  };

  const handleCreatePersona = (trackId: string) => {
    const t = tracks.find((tr: Track) => tr.id === trackId);
    if (!t) return;
    setSelectedTrackForPersona(t);
    setCreatePersonaOpen(true);
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
            <div className="h-full overflow-y-auto p-1">
              <div className="w-full max-w-2xl mx-auto">
                <MusicGeneratorV2 onTrackGenerated={handleTrackGenerated} />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel defaultSize={selectedTrack ? 45 : 75} minSize={30}>
            <div className="h-full overflow-y-auto p-4">
              <div className="mb-4">
                <Select value={selectedProjectId || "all"} onValueChange={(value) => setSelectedProjectId(value === "all" ? undefined : value)}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Все треки" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все треки</SelectItem>
                    {projects.map((project: { id: string; name: string }) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TracksList
                tracks={tracks}
                isLoading={isLoading}
                deleteTrack={deleteTrack}
                refreshTracks={refreshTracks}
                onSeparateStems={handleSeparateStems}
                onExtend={handleExtend}
                onCover={handleCover}
                onCreatePersona={handleCreatePersona}
                onSelect={setSelectedTrack}
                isDetailPanelOpen={!!selectedTrack}
                trackOperations={trackOperations}
              />
              {hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
                  </Button>
                </div>
              )}
            </div>
          </ResizablePanel>

          {/* ✅ FIX: Всегда рендерим третью панель, но управляем размером */}
          <ResizableHandle withHandle className={!selectedTrack ? "hidden" : ""} />
          
          <ResizablePanel 
            defaultSize={selectedTrack ? 30 : 0} 
            minSize={selectedTrack ? 25 : 0} 
            maxSize={selectedTrack ? 40 : 0}
            className={!selectedTrack ? "hidden" : ""}
          >
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
          createPersonaOpen={createPersonaOpen}
          setCreatePersonaOpen={setCreatePersonaOpen}
          selectedTrackForPersona={selectedTrackForPersona}
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
              <div className="mb-4">
                <Select value={selectedProjectId || "all"} onValueChange={(value) => setSelectedProjectId(value === "all" ? undefined : value)}>
                  <SelectTrigger className="w-full max-w-xs">
                    <SelectValue placeholder="Все треки" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все треки</SelectItem>
                    {projects.map((project: { id: string; name: string }) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <TracksList
                tracks={tracks}
                isLoading={isLoading}
                deleteTrack={deleteTrack}
                refreshTracks={refreshTracks}
                onSeparateStems={handleSeparateStems}
                onExtend={handleExtend}
                onCover={handleCover}
                onCreatePersona={handleCreatePersona}
                onSelect={setSelectedTrack}
                trackOperations={trackOperations}
              />
              {hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
                  </Button>
                </div>
              )}
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
          createPersonaOpen={createPersonaOpen}
          setCreatePersonaOpen={setCreatePersonaOpen}
          selectedTrackForPersona={selectedTrackForPersona}
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
      <div className="flex-1 overflow-y-auto workspace-main p-4">
        <div className="mb-4">
          <Select value={selectedProjectId || "all"} onValueChange={(value: string) => setSelectedProjectId(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Все треки" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все треки</SelectItem>
              {projects.map((project: { id: string; name: string }) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TracksList
          tracks={tracks}
          isLoading={isLoading}
          deleteTrack={deleteTrack}
          refreshTracks={refreshTracks}
          onSeparateStems={handleSeparateStems}
          onExtend={handleExtend}
          onCover={handleCover}
          onCreatePersona={handleCreatePersona}
          onSelect={setSelectedTrack}
          trackOperations={trackOperations}
        />
        {hasNextPage && (
          <div className="mt-4 flex justify-center">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Загрузка..." : "Загрузить ещё"}
            </Button>
          </div>
        )}
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
        createPersonaOpen={createPersonaOpen}
        setCreatePersonaOpen={setCreatePersonaOpen}
        selectedTrackForPersona={selectedTrackForPersona}
        onSuccess={refreshTracks}
      />

      <Portal>
        <Drawer open={showGenerator} onOpenChange={setShowGenerator}>
          <Tooltip>
            <TooltipTrigger asChild>
              <DrawerTrigger asChild>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: showGenerator ? 0 : 1,
                    opacity: showGenerator ? 0 : 1
                  }}
                  transition={{ delay: showGenerator ? 0 : 0.5, type: 'spring', stiffness: 260, damping: 20 }}
                  whileHover={{ scale: showGenerator ? 0 : 1.1 }}
                  whileTap={{ scale: showGenerator ? 0 : 0.9 }}
                  style={{ pointerEvents: showGenerator ? 'none' : 'auto' }}
                >
                  <Button
                    variant="fab"
                    size="fab"
                    className="fixed right-6"
                    style={{
                      bottom: 'calc(var(--bottom-tab-bar-height) + 1rem)',
                      position: 'fixed',
                      zIndex: 'var(--z-fab)'
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
          <DrawerContent className="h-[90vh] mt-20">
            <VisuallyHidden>
              <DrawerTitle>Создать музыку</DrawerTitle>
            </VisuallyHidden>
            <div className="w-full max-w-md mx-auto h-8 flex items-center justify-center">
              <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
            </div>
            <div className="p-4 h-full overflow-y-auto">
              <MusicGeneratorV2 onTrackGenerated={handleTrackGenerated} />
            </div>
          </DrawerContent>
        </Drawer>
      </Portal>

      <Drawer open={!!selectedTrack} onOpenChange={(open) => !open && handleCloseDetail()}>
        <DrawerContent className="h-[70vh] max-h-[75vh]">
          <VisuallyHidden>
            <DrawerTitle>Детали трека</DrawerTitle>
          </VisuallyHidden>
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
