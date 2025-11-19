
import { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DAWProject } from '@/types/daw-project.types';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProjectBrowserProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (project: DAWProject) => void;
  onDelete: (projectId: string) => void;
  isLoading: boolean;
  projects: DAWProject[];
}

export function ProjectBrowser({
  open,
  onOpenChange,
  onSelect,
  onDelete,
  isLoading,
  projects,
}: ProjectBrowserProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: (): HTMLElement => parentRef.current!,
    estimateSize: () => 44, // Estimate height of a single item
    overscan: 5,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Open Project</DialogTitle>
          <DialogDescription>
            Select a project to load it into the DAW.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {isLoading ? (
            <p>Loading projects...</p>
          ) : (
            <ScrollArea className="h-[300px] w-full" ref={parentRef}>
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: '100%',
                  position: 'relative',
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                  const project = projects[virtualItem.index];
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: `${virtualItem.size}px`,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                      className="flex justify-between items-center p-2 hover:bg-muted"
                    >
                      <span onClick={() => onSelect(project)} className="cursor-pointer truncate">
                        {project.name}
                      </span>
                      <Button variant="destructive" size="sm" onClick={() => onDelete(project.id)}>
                        Delete
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
