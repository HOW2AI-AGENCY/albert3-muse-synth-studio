/**
 * DAW Enhanced Page
 *
 * Complete Digital Audio Workstation interface with:
 * - Multi-track audio editing
 * - Stem integration
 * - Waveform visualization
 * - Transport controls
 * - Timeline with markers and regions
 * - Project management
 *
 * @module pages/workspace/DAWEnhanced
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDAWStore } from '@/stores/dawStore';
import { TransportControls } from '@/components/daw/TransportControls';
import { TimelineEnhanced } from '@/components/daw/TimelineEnhanced';
import { TrackLaneEnhanced } from '@/components/daw/TrackLaneEnhanced';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Plus,
  Save,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Music,
  MousePointer,
  Scissors,
  Pencil,
  Eraser,
  Grid3x3,
} from 'lucide-react';
import { useTracks } from '@/hooks/useTracks';
import { TrackStem } from '@/types/domain/track.types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { logInfo } from '@/utils/logger';
import { toast } from 'sonner';

export const DAWEnhanced: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  // DAW Store
  const project = useDAWStore((state) => state.project);
  const timeline = useDAWStore((state) => state.timeline);
  const tracks = useDAWStore((state) => state.project?.tracks || []);
  const toolMode = useDAWStore((state) => state.toolMode);

  const createProject = useDAWStore((state) => state.createProject);
  const saveProject = useDAWStore((state) => state.saveProject);
  const addTrack = useDAWStore((state) => state.addTrack);
  const undo = useDAWStore((state) => state.undo);
  const redo = useDAWStore((state) => state.redo);
  const setZoom = useDAWStore((state) => state.setZoom);
  const setToolMode = useDAWStore((state) => state.setToolMode);
  const toggleSnapToGrid = useDAWStore((state) => state.toggleSnapToGrid);
  const loadStemsAsMultitrack = useDAWStore((state) => state.loadStemsAsMultitrack);

  // Load user's tracks for stem loading
  const { tracks: userTracks } = useTracks();

  // Initialize project if none exists
  useEffect(() => {
    if (!project) {
      createProject('Untitled Project');
    }
  }, [project]);

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ctrl/Cmd + Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }

      // Ctrl/Cmd + Shift + Z - Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }

      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        saveProject();
        toast.success('Project saved');
      }

      // Space - Play/Pause
      if (e.code === 'Space') {
        e.preventDefault();
        const { isPlaying, play, pause } = useDAWStore.getState();
        if (isPlaying) {
          pause();
        } else {
          play();
        }
      }

      // G - Toggle snap to grid
      if (e.key === 'g') {
        toggleSnapToGrid();
        const { timeline } = useDAWStore.getState();
        toast.info(`Snap to grid ${timeline.snapToGrid ? 'enabled' : 'disabled'}`);
      }

      // Tool shortcuts
      if (e.key === 'v') setToolMode('select');
      if (e.key === 'c') setToolMode('cut');
      if (e.key === 'd') setToolMode('draw');
      if (e.key === 'e') setToolMode('erase');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, saveProject, toggleSnapToGrid, setToolMode]);

  const handleAddAudioTrack = useCallback(() => {
    addTrack('audio');
    toast.success('Audio track added');
  }, [addTrack]);

  const handleZoomIn = useCallback(() => {
    setZoom(timeline.zoom * 1.5);
  }, [timeline.zoom, setZoom]);

  const handleZoomOut = useCallback(() => {
    setZoom(timeline.zoom / 1.5);
  }, [timeline.zoom, setZoom]);

  const handleLoadStems = useCallback(
    (trackId: string) => {
      const track = userTracks?.find((t) => t.id === trackId);
      if (!track) return;

      // Fetch stems for this track
      import('@/integrations/supabase/client').then(({ supabase }) => {
        supabase
          .from('track_stems')
          .select('*')
          .eq('track_id', trackId)
          .then(({ data: stems, error }) => {
            if (error || !stems || stems.length === 0) {
              toast.error('No stems found for this track');
              return;
            }

            loadStemsAsMultitrack(stems as TrackStem[], track.title);
            toast.success(`Loaded ${stems.length} stems as multitrack`);
            logInfo('Stems loaded into DAW', 'DAWEnhanced', {
              trackId,
              stemCount: stems.length,
            });
          });
      });
    },
    [userTracks, loadStemsAsMultitrack]
  );

  const toolButtons = [
    { mode: 'select' as const, icon: MousePointer, label: 'Select (V)', key: 'v' },
    { mode: 'cut' as const, icon: Scissors, label: 'Cut (C)', key: 'c' },
    { mode: 'draw' as const, icon: Pencil, label: 'Draw (D)', key: 'd' },
    { mode: 'erase' as const, icon: Eraser, label: 'Erase (E)', key: 'e' },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground overflow-hidden">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-border bg-surface">
        {/* Left: File operations */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{project?.name || 'DAW Editor'}</span>
          <Button variant="ghost" size="sm" onClick={() => saveProject()}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button variant="ghost" size="sm" onClick={undo}>
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={redo}>
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Center: Tool palette */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          {toolButtons.map((tool) => (
            <Button
              key={tool.mode}
              variant={toolMode === tool.mode ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setToolMode(tool.mode)}
              title={tool.label}
              className="h-8 w-8 p-0"
            >
              <tool.icon className="h-4 w-4" />
            </Button>
          ))}
          <div className="w-px h-6 bg-border mx-1" />
          <Button
            variant={timeline.snapToGrid ? 'default' : 'ghost'}
            size="sm"
            onClick={toggleSnapToGrid}
            title="Snap to grid (G)"
            className="h-8 w-8 p-0"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Add tracks and stem loading */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleAddAudioTrack}>
            <Plus className="h-4 w-4 mr-1" />
            Add Track
          </Button>

          {/* Load Stems Dialog */}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Music className="h-4 w-4 mr-1" />
                Load Stems
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Load Track Stems</DialogTitle>
                <DialogDescription>
                  Select a track to load its stems as multitrack in the DAW
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Select onValueChange={handleLoadStems}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a track..." />
                  </SelectTrigger>
                  <SelectContent>
                    {userTracks
                      ?.filter((t) => t.has_stems)
                      .map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          {track.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Only tracks with separated stems are shown
                </p>
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleZoomOut}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {Math.round(timeline.zoom)}px/s
            </span>
            <Button variant="ghost" size="icon" onClick={handleZoomIn}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transport Controls */}
      <TransportControls />

      {/* Main Content */}
      <div ref={containerRef} className="flex-1 flex flex-col overflow-hidden">
        {/* Timeline */}
        <div className="flex-shrink-0">
          <TimelineEnhanced width={containerWidth} height={48} />
        </div>

        {/* Track Lanes */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {tracks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center space-y-2">
                <Music className="h-12 w-12 mx-auto opacity-50" />
                <p className="text-lg">No tracks yet</p>
                <p className="text-sm">Add a track or load stems to get started</p>
              </div>
            </div>
          ) : (
            tracks.map((track) => (
              <TrackLaneEnhanced
                key={track.id}
                track={track}
                zoom={timeline.zoom}
                scrollLeft={timeline.scrollLeft}
              />
            ))
          )}
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="px-4 py-1 border-t border-border bg-surface text-xs text-muted-foreground flex items-center gap-4">
        <span>💡 Shortcuts:</span>
        <span>Space = Play/Pause</span>
        <span>G = Snap Grid</span>
        <span>V/C/D/E = Tools</span>
        <span>Ctrl+Z/Y = Undo/Redo</span>
        <span>Ctrl+S = Save</span>
      </div>
    </div>
  );
};
