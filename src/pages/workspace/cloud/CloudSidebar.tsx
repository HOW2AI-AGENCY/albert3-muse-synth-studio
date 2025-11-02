/**
 * Cloud Sidebar - Folder Navigation
 * Навигация по папкам облака
 */

import { Folder, Trash2 } from '@/utils/iconImports';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useCloudFolders, useDeleteFolder } from '@/hooks/useCloudFolders';
import { cn } from '@/lib/utils';

interface CloudSidebarProps {
  category: string;
  selectedFolder: string | null;
  onSelectFolder: (folderId: string | null) => void;
}

export function CloudSidebar({ category, selectedFolder, onSelectFolder }: CloudSidebarProps) {
  const { folders, isLoading } = useCloudFolders(category);
  const deleteFolder = useDeleteFolder();

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation();
    if (confirm('Удалить эту папку? Файлы в ней не будут удалены.')) {
      deleteFolder.mutate(folderId);
      if (selectedFolder === folderId) {
        onSelectFolder(null);
      }
    }
  };

  if (isLoading) {
    return (
      <Card className="w-64 p-4 space-y-2">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </Card>
    );
  }

  return (
    <Card className="w-64 p-4">
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground mb-3">Папки</h3>

        {/* All files */}
        <Button
          variant={selectedFolder === null ? 'default' : 'ghost'}
          className="w-full justify-start gap-2"
          onClick={() => onSelectFolder(null)}
        >
          <Folder className="h-4 w-4" />
          Все файлы
        </Button>

        {/* Folders list */}
        {folders && folders.length > 0 ? (
          <div className="space-y-1">
            {folders.map(folder => (
              <div
                key={folder.id}
                className={cn(
                  'group flex items-center justify-between rounded-md p-2 hover:bg-accent cursor-pointer transition-colors',
                  selectedFolder === folder.id && 'bg-accent'
                )}
                onClick={() => onSelectFolder(folder.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-4 w-4 flex-shrink-0" style={{ color: folder.color || undefined }} />
                  <span className="text-sm truncate">{folder.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => handleDeleteFolder(e, folder.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground text-center py-4">
            Нет папок
          </p>
        )}
      </div>
    </Card>
  );
}
