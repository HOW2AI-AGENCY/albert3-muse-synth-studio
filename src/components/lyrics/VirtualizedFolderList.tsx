import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@/components/ui/button';
import { Folder } from 'lucide-react';

interface VirtualizedFolderListProps {
  folders: string[];
  selectedFolder: string | null;
  onSelectFolder: (folder: string | null) => void;
}

export const VirtualizedFolderList = ({
  folders,
  selectedFolder,
  onSelectFolder,
}: VirtualizedFolderListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: folders.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 3,
  });

  return (
    <div ref={parentRef} className="max-h-64 overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const folder = folders[virtualItem.index];
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
            >
              <Button
                variant={selectedFolder === folder ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => onSelectFolder(folder)}
              >
                <Folder className="mr-2 h-4 w-4" />
                {folder}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
