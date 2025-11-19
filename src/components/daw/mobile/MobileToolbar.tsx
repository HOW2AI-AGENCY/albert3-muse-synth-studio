/**
 * Mobile Toolbar Component
 *
 * Compact toolbar with essential DAW tools:
 * - Undo/Redo
 * - Add track
 * - Save
 * - Zoom
 *
 * @module components/daw/mobile/MobileToolbar
 */

import { type FC } from 'react';
import { useDAWStore } from '@/stores/daw';
import { Button } from '@/components/ui/button';
import {
  Undo2,
  Redo2,
  Plus,
  Save,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

export const MobileToolbar: FC = () => {
  const timeline = useDAWStore((state) => state.timeline);
  const undo = useDAWStore((state) => state.undo);
  const redo = useDAWStore((state) => state.redo);
  const addTrack = useDAWStore((state) => state.addTrack);
  const saveProject = useDAWStore((state) => state.saveProject);
  const setZoom = useDAWStore((state) => state.setZoom);

  const handleZoomIn = () => {
    setZoom(timeline.zoom * 1.5);
  };

  const handleZoomOut = () => {
    setZoom(timeline.zoom / 1.5);
  };

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-surface overflow-x-auto">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 min-w-8 p-2"
        onClick={undo}
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 min-w-8 p-2"
        onClick={redo}
      >
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 min-w-8 p-2"
        onClick={() => addTrack('audio')}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 min-w-8 p-2"
        onClick={saveProject}
      >
        <Save className="h-4 w-4" />
      </Button>

      <div className="flex-1" />

      <Button
        variant="ghost"
        size="sm"
        className="h-8 min-w-8 p-2"
        onClick={handleZoomOut}
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <div className="px-2 py-1 text-xs text-muted-foreground min-w-[50px] text-center">
        {Math.round(timeline.zoom)}px/s
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="h-8 min-w-8 p-2"
        onClick={handleZoomIn}
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
};
