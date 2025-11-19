/**
 * Mobile DAW Layout Component
 *
 * Optimized layout for mobile devices with:
 * - Bottom sheet interface
 * - Swipeable panels
 * - Touch-optimized controls
 * - Compact timeline
 * - Minimalist track list
 *
 * @module components/daw/mobile/DAWMobileLayout
 */

import { useState, type FC } from 'react';
import { useDAWStore } from '@/stores/daw';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Plus,
  Music,
  Settings,
  Layers,
  Wand2,
  ChevronUp,
} from 'lucide-react';
import { MobileTrackList } from './MobileTrackList';
import { MobileTimeline } from './MobileTimeline';
import { MobileTransportBar } from './MobileTransportBar';
import { MobileSunoPanel } from './MobileSunoPanel';

type MobileView = 'tracks' | 'timeline' | 'mixer' | 'suno' | 'settings';

export const DAWMobileLayout: FC = () => {
  const [activeView, setActiveView] = useState<MobileView>('tracks');
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);

  const project = useDAWStore((state) => state.project);
  const tracks = useDAWStore((state) => state.project?.tracks || []);

  const addTrack = useDAWStore((state) => state.addTrack);

  return (
    <div className="h-screen w-screen flex flex-col bg-background overflow-hidden">
      {/* Top Header */}
      <div className="flex-shrink-0 h-12 px-3 border-b border-border bg-surface flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold truncate max-w-[150px]">
            {project?.name || 'DAW'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="touch-target-min"
            onClick={() => setActiveView('suno')}
            aria-label="Открыть генерацию AI"
          >
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="touch-target-min"
            onClick={() => setActiveView('settings')}
            aria-label="Открыть настройки"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeView === 'tracks' && (
          <div className="h-full flex flex-col">
            {/* Compact Timeline */}
            <div className="flex-shrink-0">
              <MobileTimeline />
            </div>

            {/* Track List */}
            <ScrollArea className="flex-1">
              <MobileTrackList tracks={tracks} />
            </ScrollArea>

            {/* Empty State */}
            {tracks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3 p-6">
                  <Music className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">No tracks yet</p>
                  <Button size="sm" onClick={() => addTrack('audio')}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Track
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeView === 'suno' && (
          <ScrollArea className="h-full">
            <MobileSunoPanel />
          </ScrollArea>
        )}

        {activeView === 'settings' && (
          <div className="h-full p-4">
            <h2 className="text-lg font-semibold mb-4">Settings</h2>
            <p className="text-sm text-muted-foreground">Coming soon...</p>
          </div>
        )}
      </div>

      {/* Transport Bar (fixed at bottom) */}
      <MobileTransportBar />

      {/* Bottom Navigation */}
      <div className="flex-shrink-0 h-16 border-t border-border bg-surface grid grid-cols-4 gap-1 p-2">
        <Button
          variant={activeView === 'tracks' ? 'default' : 'ghost'}
          size="sm"
          className="flex flex-col items-center justify-center h-full gap-1"
          onClick={() => setActiveView('tracks')}
        >
          <Layers className="h-4 w-4" />
          <span className="text-xs">Tracks</span>
        </Button>

        <Button
          variant={activeView === 'timeline' ? 'default' : 'ghost'}
          size="sm"
          className="flex flex-col items-center justify-center h-full gap-1"
          onClick={() => setActiveView('timeline')}
        >
          <Music className="h-4 w-4" />
          <span className="text-xs">Timeline</span>
        </Button>

        <Button
          variant={activeView === 'suno' ? 'default' : 'ghost'}
          size="sm"
          className="flex flex-col items-center justify-center h-full gap-1"
          onClick={() => setActiveView('suno')}
        >
          <Wand2 className="h-4 w-4" />
          <span className="text-xs">Generate</span>
        </Button>

        <Button
          variant={activeView === 'settings' ? 'default' : 'ghost'}
          size="sm"
          className="flex flex-col items-center justify-center h-full gap-1"
          onClick={() => setActiveView('settings')}
        >
          <Settings className="h-4 w-4" />
          <span className="text-xs">Settings</span>
        </Button>
      </div>

      {/* Bottom Sheet for quick actions */}
      <Sheet open={bottomSheetOpen} onOpenChange={setBottomSheetOpen}>
        <SheetContent side="bottom" className="h-[400px]">
          <div className="py-4">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  addTrack('audio');
                  setBottomSheetOpen(false);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Audio Track
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => {
                  setActiveView('suno');
                  setBottomSheetOpen(false);
                }}
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Generate with AI
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* FAB for quick add */}
      <button
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        style={{ zIndex: 'var(--z-fab)' }}
        onClick={() => setBottomSheetOpen(true)}
      >
        <ChevronUp className="h-6 w-6" />
      </button>
    </div>
  );
};
