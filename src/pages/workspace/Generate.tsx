import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { VisuallyHidden } from "@/components/ui/visually-hidden";
import { MusicGenerator } from "@/components/generator/MusicGenerator";
import { TracksList } from "@/components/TracksList";
import { TrackDialogsManager } from "@/components/tracks/TrackDialogsManager";
import { useTracks } from "@/hooks/useTracks";
import { useTrackSync } from "@/hooks/useTrackSync";
import { useTrackRecovery } from "@/hooks/useTrackRecovery";
import { supabase } from "@/integrations/supabase/client";
import type { Track } from "@/services/api.service";

const Generate = () => {
  const { tracks, isLoading, deleteTrack, refreshTracks } = useTracks();
  const [showGenerator, setShowGenerator] = useState(false);
  const [userId, setUserId] = useState<string | undefined>();
  const [isMobile, setIsMobile] = useState(false);

  // Dialog states
  const [separateStemsOpen, setSeparateStemsOpen] = useState(false);
  const [selectedTrackForStems, setSelectedTrackForStems] = useState<{ id: string; title: string } | null>(null);
  const [extendOpen, setExtendOpen] = useState(false);
  const [selectedTrackForExtend, setSelectedTrackForExtend] = useState<Track | null>(null);
  const [coverOpen, setCoverOpen] = useState(false);
  const [selectedTrackForCover, setSelectedTrackForCover] = useState<{ id: string; title: string } | null>(null);
  const [createPersonaOpen, setCreatePersonaOpen] = useState(false);
  const [selectedTrackForPersona, setSelectedTrackForPersona] = useState<Track | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
    if (isMobile) {
      setShowGenerator(false);
    }
    setTimeout(refreshTracks, 500);
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

  const handleCreatePersona = (trackId: string) => {
    const t = tracks.find(tr => tr.id === trackId);
    if (!t) return;
    setSelectedTrackForPersona(t);
    setCreatePersonaOpen(true);
  };

  // Desktop layout
  if (!isMobile) {
    return (
      <div className="h-full flex gap-4 p-4">
        {/* Generator sidebar */}
        <div className="w-96 flex-shrink-0 border rounded-lg bg-card">
          <MusicGenerator onTrackGenerated={handleTrackGenerated} />
        </div>

        {/* Tracks list */}
        <div className="flex-1 overflow-y-auto">
          <TracksList
            tracks={tracks}
            isLoading={isLoading}
            deleteTrack={deleteTrack}
            refreshTracks={refreshTracks}
            onSeparateStems={handleSeparateStems}
            onExtend={handleExtend}
            onCover={handleCover}
            onCreatePersona={handleCreatePersona}
            onSelect={() => {}} // Removed detail panel for simplicity
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
          createPersonaOpen={createPersonaOpen}
          setCreatePersonaOpen={setCreatePersonaOpen}
          selectedTrackForPersona={selectedTrackForPersona}
          onSuccess={refreshTracks}
        />
      </div>
    );
  }

  // Mobile layout
  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <TracksList
          tracks={tracks}
          isLoading={isLoading}
          deleteTrack={deleteTrack}
          refreshTracks={refreshTracks}
          onSeparateStems={handleSeparateStems}
          onExtend={handleExtend}
          onCover={handleCover}
          onCreatePersona={handleCreatePersona}
            onSelect={() => {}} // Removed detail panel for simplicity
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
        createPersonaOpen={createPersonaOpen}
        setCreatePersonaOpen={setCreatePersonaOpen}
        selectedTrackForPersona={selectedTrackForPersona}
        onSuccess={refreshTracks}
      />

      <Drawer open={showGenerator} onOpenChange={setShowGenerator}>
        <DrawerTrigger asChild>
          <Button
            size="lg"
            className="fixed right-6 bottom-20 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
            aria-label="Создать музыку"
          >
            <Plus className="h-6 w-6" />
          </Button>
        </DrawerTrigger>
        <DrawerContent className="h-[90vh]">
          <VisuallyHidden>
            <DrawerTitle>Создать музыку</DrawerTitle>
          </VisuallyHidden>
          <div className="w-full h-8 flex items-center justify-center">
            <div className="w-12 h-1 bg-muted-foreground/20 rounded-full" />
          </div>
          <div className="p-4 h-full overflow-y-auto">
            <MusicGenerator onTrackGenerated={handleTrackGenerated} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default Generate;
