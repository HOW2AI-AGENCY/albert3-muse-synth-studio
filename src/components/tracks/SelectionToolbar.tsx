import React from 'react';
import { useSelectedTracks } from '@/contexts/SelectedTracksContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Trash2, 
  Copy, 
  FolderOpen, 
  X,
  Play,
  Pause,
  Share2
} from 'lucide-react';
import { toast } from 'sonner';

interface SelectionToolbarProps {
  className?: string;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ className = '' }) => {
  const { 
    selectedTracksCount, 
    clearSelection, 
    isSelectionMode,
    setSelectionMode 
  } = useSelectedTracks();

  if (!isSelectionMode || selectedTracksCount === 0) {
    return null;
  }

  const handleDownload = () => {
    toast.info(`Downloading ${selectedTracksCount} tracks...`);
    // TODO: Implement bulk download
  };

  const handleDelete = () => {
    toast.error(`Delete ${selectedTracksCount} tracks?`, {
      action: {
        label: 'Delete',
        onClick: () => {
          // TODO: Implement bulk delete
          toast.success(`${selectedTracksCount} tracks deleted`);
          clearSelection();
        },
      },
    });
  };

  const handleAddToProject = () => {
    toast.info(`Adding ${selectedTracksCount} tracks to project...`);
    // TODO: Implement add to project
  };

  const handlePlay = () => {
    toast.info(`Playing ${selectedTracksCount} tracks...`);
    // TODO: Implement bulk play
  };

  const handleShare = () => {
    toast.info(`Sharing ${selectedTracksCount} tracks...`);
    // TODO: Implement bulk share
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(`${selectedTracksCount} tracks selected`);
    toast.success('Selection info copied to clipboard');
  };

  return (
    <div className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
      <div className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 min-w-80">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {selectedTracksCount} selected
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectionMode(false)}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePlay}
            className="flex-1 min-w-0"
          >
            <Play className="h-4 w-4 mr-1" />
            Play
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownload}
            className="flex-1 min-w-0"
          >
            <Download className="h-4 w-4 mr-1" />
            Download
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddToProject}
            className="flex-1 min-w-0"
          >
            <FolderOpen className="h-4 w-4 mr-1" />
            Add to Project
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="flex-1 min-w-0"
          >
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex-1 min-w-0"
          >
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            className="flex-1 min-w-0"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>

        <div className="mt-3 pt-3 border-t">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSelection}
            className="w-full"
          >
            Clear Selection
          </Button>
        </div>
      </div>
    </div>
  );
};