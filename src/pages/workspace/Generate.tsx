import { useState, Suspense, lazy, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MusicGeneratorV2 } from "@/components/MusicGeneratorV2";
import { TracksList } from "@/components/TracksList";
const DetailPanel = lazy(() => import("@/features/tracks/ui/DetailPanel").then(m => ({ default: m.DetailPanel })));
import { useBreakpoints } from "@/hooks/useBreakpoints";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "@/utils/iconImports";
import { Drawer, DrawerContent, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
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
import { useAuth } from "@/contexts/auth/useAuth";
import { useUIStateStore } from "@/stores/uiStateStore";
import { ViewSwitcher } from "@/components/tracks/ViewSwitcher";
import { Filter } from "@/utils/iconImports";

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    try {
      const saved = typeof window !== 'undefined' ? localStorage.getItem('tracks-view-mode') : 'grid';
      return (saved as 'grid' | 'list') || 'grid';
    } catch {
      return 'grid';
    }
  });


  // Dialog states
  const [separateStemsOpen, setSeparateStemsOpen] = useState(false);
  const [selectedTrackForStems, setSelectedTrackForStems] = useState<{ id: string; title: string } | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [selectedTrackForExtend, setSelectedTrackForExtend] = useState<Track | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [selectedTrackForCover, setSelectedTrackForCover] = useState<{ id: string; title: string } | null>(null);
  const [createPersonaOpen, setCreatePersonaOpen] = useState(false);
  const [selectedTrackForPersona, setSelectedTrackForPersona] = useState<Track | null>(null);

  const { isDesktop, isTablet } = useBreakpoints();

  // Глобальное состояние UI для управления видимостью FAB
  const registerDialog = useUIStateStore((state) => state.registerDialog);
  const unregisterDialog = useUIStateStore((state) => state.unregisterDialog);
  const shouldHideFAB = useUIStateStore((state) => state.shouldHideFAB());

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

  // Регистрируем открытые диалоги для управления FAB
  useEffect(() => {
    if (showGenerator) {
      registerDialog('generator');
    } else {
      unregisterDialog('generator');
    }
    return () => unregisterDialog('generator');
  }, [showGenerator, registerDialog, unregisterDialog]);

  useEffect(() => {
    if (selectedTrack) {
      registerDialog('trackDetail');
    } else {
      unregisterDialog('trackDetail');
    }
    return () => unregisterDialog('trackDetail');
  }, [selectedTrack, registerDialog, unregisterDialog]);

  useEffect(() => {
    if (separateStemsOpen) {
      registerDialog('separateStems');
    } else {
      unregisterDialog('separateStems');
    }
    return () => unregisterDialog('separateStems');
  }, [separateStemsOpen, registerDialog, unregisterDialog]);

  useEffect(() => {
    if (extendOpen) {
      registerDialog('extend');
    } else {
      unregisterDialog('extend');
    }
    return () => unregisterDialog('extend');
  }, [extendOpen, registerDialog, unregisterDialog]);

  useEffect(() => {
    if (coverOpen) {
      registerDialog('cover');
    } else {
      unregisterDialog('cover');
    }
    return () => unregisterDialog('cover');
  }, [coverOpen, registerDialog, unregisterDialog]);

  useEffect(() => {
    if (createPersonaOpen) {
      registerDialog('createPersona');
    } else {
      unregisterDialog('createPersona');
    }
    return () => unregisterDialog('createPersona');
  }, [createPersonaOpen, registerDialog, unregisterDialog]);

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

  const handleViewChange = (view: 'grid' | 'list') => {
    setViewMode(view);
    try {
      localStorage.setItem('tracks-view-mode', view);
    } catch {
      // Ignore storage errors
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
                viewMode={viewMode}
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
                viewMode={viewMode}
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
      {/* Mobile Header - компактный */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
        <h2 className="text-lg font-bold truncate">Мои треки</h2>
        <div className="flex items-center gap-1.5">
          <ViewSwitcher view={viewMode} onViewChange={handleViewChange} />
          <Drawer>
            <DrawerTrigger asChild>
              <Button variant="outline" size="icon" className="h-9 w-9">
                <Filter className="h-4 w-4" />
              </Button>
            </DrawerTrigger>
            <DrawerContent className="h-auto max-h-[50vh]">
              <VisuallyHidden>
                <DrawerTitle>Фильтры</DrawerTitle>
              </VisuallyHidden>
              <div className="p-4 pb-safe">
                <h3 className="text-base font-semibold mb-3">Фильтры</h3>
                <div className="space-y-3">
                  <Select value={selectedProjectId || "all"} onValueChange={(value: string) => setSelectedProjectId(value === "all" ? undefined : value)}>
                    <SelectTrigger className="w-full h-11">
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
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>

      {/* Track List - с правильными отступами для мобильных */}
      <div className="flex-1 overflow-y-auto px-3 py-3 pb-safe"
        style={{
          paddingBottom: 'calc(var(--workspace-bottom-offset) + 1rem + env(safe-area-inset-bottom))'
        }}
      >
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
          viewMode={viewMode}
        />
        {hasNextPage && (
          <div className="mt-3 flex justify-center pb-4">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              className="h-11 px-6"
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

      {/* FAB для генератора - улучшенная мобильная версия */}
      <AnimatePresence>
        {!shouldHideFAB && (
          <Portal>
            <Tooltip>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    variant="fab"
                    size="fab"
                    onClick={() => setShowGenerator(true)}
                    className="fixed"
                    style={{
                      right: 'max(1rem, env(safe-area-inset-right))',
                      bottom: 'calc(var(--workspace-bottom-offset) + 1rem + env(safe-area-inset-bottom))',
                      zIndex: 'var(--z-fab)',
                      willChange: 'transform'
                    }}
                    aria-label="Создать музыку"
                  >
                    <Plus className="h-6 w-6" />
                  </Button>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p className="text-sm font-medium">Создать музыку</p>
              </TooltipContent>
            </Tooltip>
          </Portal>
        )}
      </AnimatePresence>

      {/* Generator Drawer - оптимизирован для мобильных */}
      <Drawer open={showGenerator} onOpenChange={setShowGenerator}>
        <DrawerContent className="h-[92vh] max-h-[92vh]">
          <VisuallyHidden>
            <DrawerTitle>Создать музыку</DrawerTitle>
          </VisuallyHidden>
          <div className="overflow-y-auto h-full px-3 py-4 pb-safe">
            <MusicGeneratorV2 onTrackGenerated={handleTrackGenerated} />
          </div>
        </DrawerContent>
      </Drawer>

      {/* Detail Panel - улучшенный мобильный drawer */}
      <Drawer open={!!selectedTrack} onOpenChange={(open) => !open && handleCloseDetail()}>
        <DrawerContent className="h-[85vh] max-h-[85vh]">
          <VisuallyHidden>
            <DrawerTitle>Детали трека</DrawerTitle>
          </VisuallyHidden>
          
          {selectedTrack && (
            <Suspense fallback={
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            }>
              <div className="overflow-y-auto h-full pb-safe">
                <DetailPanel
                  track={normalizeTrack(selectedTrack)}
                  onClose={handleCloseDetail}
                  onUpdate={refreshTracks}
                  onDelete={handleDelete}
                  variant="mobile"
                />
              </div>
            </Suspense>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Generate;
