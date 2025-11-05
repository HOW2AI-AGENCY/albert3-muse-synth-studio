/**
 * WorkspaceShell Component
 *
 * 3-column Suno-like workspace layout
 * Left: StyleEditor + Options | Center: Content | Right: Inspector (sticky)
 *
 * @version 1.0.0
 * @created 2025-11-05
 */

import { memo, useState, useCallback, ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { WorkspaceShellProps } from '@/types/suno-ui.types';

export const WorkspaceShell = memo<WorkspaceShellProps>(({
  leftPanel,
  centerContent,
  rightPanel,
  showRightPanel = true,
  rightPanelSticky = true,
  mobileLayout = 'tabs',
}) => {
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [isRightExpanded, setIsRightExpanded] = useState(false);

  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const isDesktop = useMediaQuery('(min-width: 1024px)');

  const toggleLeftPanel = useCallback(() => {
    setIsLeftCollapsed((prev) => !prev);
  }, []);

  const toggleRightPanel = useCallback(() => {
    setIsRightCollapsed((prev) => !prev);
  }, []);

  const toggleRightExpanded = useCallback(() => {
    setIsRightExpanded((prev) => !prev);
  }, []);

  // Mobile layout with tabs
  if (isMobile && mobileLayout === 'tabs') {
    return (
      <div className="flex flex-col h-full">
        <Tabs defaultValue="content" className="flex-1 flex flex-col">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="editor">Editor</TabsTrigger>
            <TabsTrigger value="content">Tracks</TabsTrigger>
            <TabsTrigger value="inspector" disabled={!showRightPanel}>
              Details
            </TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4">{leftPanel}</div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="content" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-2">{centerContent}</div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="inspector" className="flex-1 mt-0">
            <ScrollArea className="h-full">
              <div className="p-4">{rightPanel}</div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Tablet layout (2 columns, collapsible)
  if (isTablet) {
    return (
      <div className="flex h-full gap-4 p-4">
        {/* Left Panel - Collapsible */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            isLeftCollapsed ? 'w-0 opacity-0' : 'w-80 opacity-100'
          )}
        >
          {!isLeftCollapsed && (
            <ScrollArea className="h-full">
              <div className="pr-2">{leftPanel}</div>
            </ScrollArea>
          )}
        </div>

        {/* Toggle Left Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLeftPanel}
          className="self-start shrink-0"
        >
          {isLeftCollapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>

        {/* Center + Right Combined */}
        <div className="flex-1 flex flex-col gap-4">
          <ScrollArea className="flex-1">
            <div className="pr-2">{centerContent}</div>
          </ScrollArea>

          {showRightPanel && !isRightCollapsed && (
            <div className="border-t pt-4">
              <ScrollArea className="h-[300px]">
                {rightPanel}
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop layout (3 columns)
  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left Panel */}
      <div
        className={cn(
          'transition-all duration-300 ease-in-out shrink-0',
          isLeftCollapsed ? 'w-12' : 'w-80'
        )}
      >
        {isLeftCollapsed ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLeftPanel}
            className="w-full"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Music Editor
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleLeftPanel}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1">
              <div className="pr-2">{leftPanel}</div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Center Content */}
      <div className="flex-1 min-w-0">
        <ScrollArea className="h-full">
          <div className="px-2">{centerContent}</div>
        </ScrollArea>
      </div>

      {/* Right Panel (Inspector) */}
      {showRightPanel && (
        <div
          className={cn(
            'transition-all duration-300 ease-in-out shrink-0 border-l',
            isRightCollapsed && 'w-12',
            !isRightCollapsed && !isRightExpanded && 'w-96',
            !isRightCollapsed && isRightExpanded && 'w-[600px]'
          )}
        >
          {isRightCollapsed ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleRightPanel}
              className="w-full"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex items-center justify-between mb-4 pl-4">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  Track Details
                </h2>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleRightExpanded}
                    title={isRightExpanded ? 'Collapse' : 'Expand'}
                  >
                    {isRightExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleRightPanel}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              {rightPanelSticky ? (
                <div className="sticky top-4">
                  <ScrollArea className="h-[calc(100vh-8rem)]">
                    <div className="pl-4 pr-2">{rightPanel}</div>
                  </ScrollArea>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="pl-4 pr-2">{rightPanel}</div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

WorkspaceShell.displayName = 'WorkspaceShell';
