/**
 * Generate Page - оптимизированная версия
 * Разделена на модули для улучшения производительности и bundle size
 */
import { Suspense, lazy, useEffect } from "react";
import { MusicGeneratorV2 } from "@/components/MusicGeneratorV2";
import { TracksList } from "@/components/TracksList";
const DetailPanel = lazy(() => import("@/features/tracks/ui/DetailPanel").then(m => ({ default: m.DetailPanel })));
import { useBreakpoints } from "@/hooks/useBreakpoints";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Plus } from "@/utils/iconImports";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
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

import { TrackDialogsManager } from "@/components/tracks/TrackDialogsManager";
import { useMusicProjects } from "@/hooks/useMusicProjects";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/auth/useAuth";
import { useUIStateStore } from "@/stores/uiStateStore";
import { ViewSwitcher } from "@/components/tracks/ViewSwitcher";
import { EnhancedErrorBoundary } from "@/components/errors/EnhancedErrorBoundary";
import { NetworkAlert } from "@/components/ui/NetworkAlert";
import { useGeneratePageState } from "./useGeneratePageState";
import { useGeneratePageHandlers } from "./useGeneratePageHandlers";

const Generate = () => {
  const { userId } = useAuth();
  const state = useGeneratePageState();
  
  const {
    tracks,
    isLoading,
    deleteTrack,
    refreshTracks,
  } = useTracks(undefined, {
    projectId: state.selectedProjectId,
    excludeDraftTracks: true,
    pageSize: 25,
  });
  
  const { projects } = useMusicProjects();
  const { isDesktop, isTablet } = useBreakpoints();

  const handlers = useGeneratePageHandlers({
    ...state,
    deleteTrack,
    refreshTracks,
  });

  // Глобальное состояние UI для управления видимостью FAB
  const registerDialog = useUIStateStore((state) => state.registerDialog);
  const unregisterDialog = useUIStateStore((state) => state.unregisterDialog);

  useTrackSync(userId || undefined, {
    onTrackCompleted: refreshTracks,
    onTrackFailed: refreshTracks,
  });

  useTrackRecovery(userId || undefined, refreshTracks);

  // Регистрация диалогов для управления FAB
  useEffect(() => {
    if (state.showGenerator) {
      registerDialog('generator');
    } else {
      unregisterDialog('generator');
    }
    return () => unregisterDialog('generator');
  }, [state.showGenerator, registerDialog, unregisterDialog]);

  return (
    <>
      <NetworkAlert />
      
      <div className="h-full flex flex-col">
        {/* Desktop Layout с ResizablePanel */}
        {(isDesktop || isTablet) ? (
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Левая панель: Генератор */}
            <ResizablePanel defaultSize={35} minSize={30} maxSize={45}>
              <div className="h-full overflow-y-auto p-4 bg-background/50">
                <EnhancedErrorBoundary>
                  <MusicGeneratorV2 onTrackGenerated={handlers.handleTrackGenerated} />
                </EnhancedErrorBoundary>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Средняя панель: Список треков */}
            <ResizablePanel defaultSize={state.selectedTrack ? 40 : 65} minSize={35}>
              <div className="h-full flex flex-col">
                {/* Header с фильтрами */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-3 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Select value={state.selectedProjectId || 'all'} onValueChange={(v) => state.setSelectedProjectId(v === 'all' ? undefined : v)}>
                      <SelectTrigger className="w-[180px] h-8">
                        <SelectValue placeholder="Все проекты" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все проекты</SelectItem>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <ViewSwitcher view={state.viewMode} onViewChange={state.handleViewModeChange} />
                  </div>
                </div>

                {/* Tracks List */}
                <div className="flex-1 overflow-y-auto p-4">
                  <TracksList
                    tracks={tracks}
                    isLoading={isLoading}
                    deleteTrack={deleteTrack}
                    refreshTracks={refreshTracks}
                    onSelect={handlers.handleTrackSelect}
                    onSeparateStems={(trackId) => {
                      const track = tracks.find(t => t.id === trackId);
                      if (track) handlers.handleSeparateStems(track);
                    }}
                    onExtend={(trackId) => {
                      const track = tracks.find(t => t.id === trackId);
                      if (track) handlers.handleExtendTrack(track);
                    }}
                    onCover={(trackId) => {
                      const track = tracks.find(t => t.id === trackId);
                      if (track) handlers.handleCreateCover(track);
                    }}
                    onCreatePersona={(trackId) => {
                      const track = tracks.find(t => t.id === trackId);
                      if (track) handlers.handleCreatePersona(track);
                    }}
                    trackOperations={handlers.handleRemix as any}
                    viewMode={state.viewMode}
                  />
                </div>
              </div>
            </ResizablePanel>

            {/* Правая панель: Detail Panel (условно) */}
            {state.selectedTrack && (
              <>
                <ResizableHandle withHandle />
                <ResizablePanel ref={state.detailPanelRef} defaultSize={25} minSize={20} maxSize={40} collapsible>
                  <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                    <DetailPanel
                      track={normalizeTrack(state.selectedTrack)}
                      onClose={handlers.handleCloseDetail}
                      onDelete={() => {
                        if (state.selectedTrack) {
                          handlers.handleDelete(state.selectedTrack.id);
                        }
                      }}
                      onRemix={() => {
                        if (state.selectedTrack) {
                          handlers.handleRemix(state.selectedTrack);
                        }
                      }}
                    />
                  </Suspense>
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        ) : (
          /* Mobile Layout */
          <div className="flex-1 overflow-y-auto">
            {/* Header с фильтрами */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Select value={state.selectedProjectId || 'all'} onValueChange={(v) => state.setSelectedProjectId(v === 'all' ? undefined : v)}>
                  <SelectTrigger className="flex-1 h-9">
                    <SelectValue placeholder="Все проекты" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все проекты</SelectItem>
                    {projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <ViewSwitcher view={state.viewMode} onViewChange={state.handleViewModeChange} />
              </div>
            </div>

            {/* Tracks List */}
            <div className="p-3">
              <TracksList
                tracks={tracks}
                isLoading={isLoading}
                deleteTrack={deleteTrack}
                refreshTracks={refreshTracks}
                onSelect={handlers.handleTrackSelect}
                onSeparateStems={(trackId) => {
                  const track = tracks.find(t => t.id === trackId);
                  if (track) handlers.handleSeparateStems(track);
                }}
                onExtend={(trackId) => {
                  const track = tracks.find(t => t.id === trackId);
                  if (track) handlers.handleExtendTrack(track);
                }}
                onCover={(trackId) => {
                  const track = tracks.find(t => t.id === trackId);
                  if (track) handlers.handleCreateCover(track);
                }}
                onCreatePersona={(trackId) => {
                  const track = tracks.find(t => t.id === trackId);
                  if (track) handlers.handleCreatePersona(track);
                }}
                trackOperations={handlers.handleRemix as any}
                viewMode={state.viewMode}
              />
            </div>
          </div>
        )}

        {/* FAB для мобильных - всегда видимый */}
        {!isDesktop && !isTablet && !state.showGenerator && (
          <Portal>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => state.setShowGenerator(true)}
                  style={{ bottom: 'calc(var(--workspace-bottom-offset, 0px) + 1rem)' }}
                  className="fixed right-4 h-16 w-16 rounded-full shadow-glow-primary touch-target-optimal z-50 bg-primary hover:bg-primary/90 transition-all hover:scale-110"
                  size="icon"
                  aria-label="Создать музыку"
                >
                  <Plus className="h-7 w-7" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-base">Создать музыку</TooltipContent>
            </Tooltip>
          </Portal>
        )}

        {/* Track Dialogs */}
        <TrackDialogsManager
          separateStemsOpen={state.separateStemsOpen}
          setSeparateStemsOpen={state.setSeparateStemsOpen}
          selectedTrackForStems={state.selectedTrackForStems}
          setSelectedTrackForStems={state.setSelectedTrackForStems}
          extendOpen={state.extendOpen}
          setExtendOpen={state.setExtendOpen}
          selectedTrackForExtend={state.selectedTrackForExtend}
          coverOpen={state.coverOpen}
          setCoverOpen={state.setCoverOpen}
          selectedTrackForCover={state.selectedTrackForCover}
          createPersonaOpen={state.createPersonaOpen}
          setCreatePersonaOpen={state.setCreatePersonaOpen}
          selectedTrackForPersona={state.selectedTrackForPersona}
          onSuccess={refreshTracks}
        />

        {/* Desktop Detail Sheet */}
        {!isDesktop && !isTablet && (
          <Sheet open={!!state.selectedTrack} onOpenChange={(open) => !open && handlers.handleCloseDetail()}>
            <SheetContent side="right" className="w-full sm:w-[500px] p-0 border-l">
              {state.selectedTrack && (
                <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}>
                  <DetailPanel
                    track={normalizeTrack(state.selectedTrack)}
                    onClose={handlers.handleCloseDetail}
                    onDelete={() => {
                      if (state.selectedTrack) {
                        handlers.handleDelete(state.selectedTrack.id);
                      }
                    }}
                    onRemix={() => {
                      if (state.selectedTrack) {
                        handlers.handleRemix(state.selectedTrack);
                      }
                    }}
                  />
                </Suspense>
              )}
            </SheetContent>
          </Sheet>
        )}

        {/* Generator Drawer для мобильных */}
        <Drawer open={state.showGenerator} onOpenChange={state.setShowGenerator}>
          <DrawerContent className="h-[92vh] max-h-[92vh]">
            <VisuallyHidden>
              <DrawerTitle>Создать музыку</DrawerTitle>
            </VisuallyHidden>
            <div className="overflow-y-auto h-full px-3 py-4 pb-safe">
              <EnhancedErrorBoundary>
                <MusicGeneratorV2 onTrackGenerated={handlers.handleTrackGenerated} />
              </EnhancedErrorBoundary>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </>
  );
};

export default Generate;
