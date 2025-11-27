import React, { useState } from 'react';
import { useSelectedTracks } from '@/contexts/selected-tracks/useSelectedTracks';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { trackConverters } from '@/types/domain/track.types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Trash2, 
  Copy, 
  FolderOpen, 
  X,
  Play,
  Share2,
  FileArchive
} from 'lucide-react';
import { toast } from 'sonner';
import { 
  bulkDownloadTracks, 
  bulkDeleteTracks, 
  bulkAddToProject, 
  generateShareLink,
  bulkExportToZip,
  type BulkOperationProgress as ProgressType
} from '@/utils/bulkOperations';
import { BulkOperationProgress } from './BulkOperationProgress';
import { ProjectSelectorDialog } from './ProjectSelectorDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';

interface SelectionToolbarProps {
  className?: string;
}

export const SelectionToolbar: React.FC<SelectionToolbarProps> = ({ className = '' }) => {
  const { 
    selectedTracksCount, 
    selectedTrackIds,
    clearSelection, 
    isSelectionMode,
    setSelectionMode 
  } = useSelectedTracks();

  const { playTrackWithQueue } = useAudioPlayerStore();

  const [progressDialog, setProgressDialog] = useState<{
    open: boolean;
    title: string;
    description?: string;
    progress: ProgressType | null;
    isCompleted: boolean;
    result?: { success: number; failed: number };
  }>({
    open: false,
    title: '',
    progress: null,
    isCompleted: false,
  });

  const [projectDialog, setProjectDialog] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  if (!isSelectionMode || selectedTracksCount === 0) {
    return null;
  }

  const trackIdsArray = Array.from(selectedTrackIds);

  // ===== BULK DOWNLOAD =====
  const handleDownload = async () => {
    setProgressDialog({
      open: true,
      title: 'Загрузка треков',
      description: `Скачивание ${selectedTracksCount} треков`,
      progress: null,
      isCompleted: false,
    });

    const result = await bulkDownloadTracks(trackIdsArray, (progress) => {
      setProgressDialog(prev => ({ ...prev, progress }));
    });

    setProgressDialog(prev => ({
      ...prev,
      isCompleted: true,
      result,
    }));

    if (result.success > 0) {
      toast.success(`Скачано треков: ${result.success}`);
    }
    if (result.failed > 0) {
      toast.error(`Ошибок: ${result.failed}`);
    }
  };

  // ===== BULK DELETE =====
  const handleDeleteConfirm = async () => {
    setDeleteDialog(false);

    setProgressDialog({
      open: true,
      title: 'Удаление треков',
      description: `Удаление ${selectedTracksCount} треков`,
      progress: null,
      isCompleted: false,
    });

    const result = await bulkDeleteTracks(trackIdsArray, (progress) => {
      setProgressDialog(prev => ({ ...prev, progress }));
    });

    setProgressDialog(prev => ({
      ...prev,
      isCompleted: true,
      result,
    }));

    if (result.success > 0) {
      toast.success(`Удалено треков: ${result.success}`);
      clearSelection();
    }
    if (result.failed > 0) {
      toast.error(`Ошибок: ${result.failed}`);
    }
  };

  // ===== ADD TO PROJECT =====
  const handleAddToProject = async (projectId: string) => {
    setProgressDialog({
      open: true,
      title: 'Добавление в проект',
      description: `Добавление ${selectedTracksCount} треков в проект`,
      progress: null,
      isCompleted: false,
    });

    const result = await bulkAddToProject(trackIdsArray, projectId, (progress) => {
      setProgressDialog(prev => ({ ...prev, progress }));
    });

    setProgressDialog(prev => ({
      ...prev,
      isCompleted: true,
      result,
    }));

    if (result.success > 0) {
      toast.success(`Добавлено треков: ${result.success}`);
    }
    if (result.failed > 0) {
      toast.error(`Ошибок: ${result.failed}`);
    }
  };

  // ===== BULK PLAY =====
  const handlePlay = async () => {
    try {
      // Fetch track data
      const { data: tracks, error } = await supabase
        .from('tracks')
        .select('*')
        .in('id', trackIdsArray)
        .eq('status', 'completed'); // Only completed tracks

      if (error || !tracks || tracks.length === 0) {
        toast.error('Не удалось загрузить треки');
        return;
      }

      const audioTracks = tracks
        .map((t) => trackConverters.toAudioPlayer(t as any))
        .filter((track): track is NonNullable<typeof track> => track !== null);

      if (audioTracks.length === 0) {
        toast.error('Нет доступных треков для воспроизведения');
        return;
      }

      playTrackWithQueue(audioTracks[0], audioTracks);

      toast.success(`Воспроизведение ${audioTracks.length} треков`);
    } catch (error) {
      toast.error('Ошибка воспроизведения');
    }
  };

  // ===== BULK SHARE =====
  const handleShare = async () => {
    try {
      const shareLink = await generateShareLink(trackIdsArray);

      await navigator.clipboard.writeText(shareLink);

      toast.success('Ссылка скопирована в буфер обмена', {
        description: 'Поделитесь ссылкой с друзьями',
        action: {
          label: 'Открыть',
          onClick: () => window.open(shareLink, '_blank'),
        },
      });
    } catch (error) {
      toast.error('Не удалось создать ссылку');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(trackIdsArray.join('\n'));
    toast.success('ID треков скопированы в буфер обмена');
  };

  // ===== BULK EXPORT TO ZIP =====
  const handleExportToZip = async () => {
    setProgressDialog({
      open: true,
      title: 'Экспорт в ZIP',
      description: `Архивация ${selectedTracksCount} треков`,
      progress: null,
      isCompleted: false,
    });

    const { data: tracks, error } = await supabase
        .from('tracks')
        .select('*')
        .in('id', trackIdsArray)
        .eq('status', 'completed');

    if (error || !tracks || tracks.length === 0) {
        toast.error('Не удалось загрузить треки для экспорта');
        setProgressDialog(prev => ({ ...prev, isCompleted: true, result: { success: 0, failed: selectedTracksCount } }));
        return;
    }

    const result = await bulkExportToZip(tracks as any, (progress) => {
      setProgressDialog(prev => ({ ...prev, progress }));
    });

    setProgressDialog(prev => ({
      ...prev,
      isCompleted: true,
      result,
    }));

    if (result.failed > 0) {
      toast.error(`Не удалось экспортировать треков: ${result.failed}`);
    }
    // Success toast is handled by the browser's download prompt
  };

  return (
    <>
      <div
        className={`fixed bottom-4 left-1/2 transform -translate-x-1/2 ${className} safe-area-bottom`}
        style={{ zIndex: 'var(--z-mini-player)' }}
      >
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
              onClick={handleExportToZip}
              className="flex-1 min-w-0"
            >
              <FileArchive className="h-4 w-4 mr-1" />
              Export
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
              onClick={() => setProjectDialog(true)}
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
              onClick={() => setDeleteDialog(true)}
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

      {/* Progress Dialog */}
      <BulkOperationProgress
        open={progressDialog.open}
        onOpenChange={(open) => setProgressDialog(prev => ({ ...prev, open }))}
        title={progressDialog.title}
        description={progressDialog.description}
        progress={progressDialog.progress}
        isCompleted={progressDialog.isCompleted}
        result={progressDialog.result}
      />

      {/* Project Selector Dialog */}
      <ProjectSelectorDialog
        open={projectDialog}
        onOpenChange={setProjectDialog}
        onSelectProject={handleAddToProject}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить треки?</AlertDialogTitle>
            <AlertDialogDescription>
              Вы собираетесь удалить {selectedTracksCount} треков. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};