import React from 'react';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { Timeline } from '@/components/daw/Timeline';
import { TrackLane } from '@/components/daw/TrackLane';

export const DAW: React.FC = () => {
  return (
    <div className="h-screen w-screen flex flex-col bg-background text-foreground">
      {/* Toolbar */}
      <div className="h-16 border-b border-border flex items-center px-4">
        <p>Toolbar</p>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* TrackInfoPanel */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full p-4 border-r border-border">
              <p>Track Info Panel</p>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          {/* TimelinePanel */}
          <ResizablePanel defaultSize={80}>
            <div className="h-full flex flex-col">
              <Timeline />
              <div className="flex-1 overflow-y-auto">
                <TrackLane />
                <TrackLane />
                <TrackLane />
              </div>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
};
