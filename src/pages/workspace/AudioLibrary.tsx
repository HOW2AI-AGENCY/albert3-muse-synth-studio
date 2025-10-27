/**
 * Audio Library Page
 * Sprint 30: Lyrics & Audio Management - Phase 2
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star, Folder, Upload } from 'lucide-react';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { AudioVirtualGrid } from '@/components/audio/AudioVirtualGrid';
import { AudioPreviewPanel } from '@/components/audio/AudioPreviewPanel';
import { AudioUpload } from '@/components/audio/AudioUpload';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function AudioLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const isMobile = useIsMobile();

  const { items: audioItems, isLoading } = useAudioLibrary({
    folder: selectedFolder || undefined,
    favorite: showFavorites,
    sourceType: selectedSourceType || undefined,
  });

  const folders = React.useMemo(() => {
    if (!audioItems) return [];
    const folderSet = new Set(audioItems.filter(a => a.folder).map(a => a.folder!));
    return Array.from(folderSet);
  }, [audioItems]);

  const selectedAudioData = React.useMemo(() => {
    return audioItems?.find(a => a.id === selectedAudio);
  }, [audioItems, selectedAudio]);

  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return audioItems;
    const query = searchQuery.toLowerCase();
    return audioItems.filter(item =>
      item.file_name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.tags.some(tag => tag.toLowerCase().includes(query))
    );
  }, [audioItems, searchQuery]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Аудио библиотека</h2>
            <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button size="icon" variant="ghost">
                  <Upload className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Загрузить аудио</DialogTitle>
                </DialogHeader>
                <AudioUpload onUploadComplete={() => setUploadDialogOpen(false)} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-2">
            <Button
              variant={!selectedFolder && !showFavorites && !selectedSourceType ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setSelectedFolder(null);
                setShowFavorites(false);
                setSelectedSourceType(null);
              }}
            >
              <Folder className="mr-2 h-4 w-4" />
              Все ({audioItems?.length || 0})
            </Button>

            <Button
              variant={showFavorites ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setShowFavorites(true);
                setSelectedFolder(null);
                setSelectedSourceType(null);
              }}
            >
              <Star className="mr-2 h-4 w-4" />
              Избранное ({audioItems?.filter(a => a.is_favorite).length || 0})
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Источник</p>
            <Button
              variant={selectedSourceType === 'upload' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setSelectedSourceType('upload');
                setSelectedFolder(null);
                setShowFavorites(false);
              }}
            >
              Загруженные ({audioItems?.filter(a => a.source_type === 'upload').length || 0})
            </Button>
            <Button
              variant={selectedSourceType === 'recording' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setSelectedSourceType('recording');
                setSelectedFolder(null);
                setShowFavorites(false);
              }}
            >
              Записи ({audioItems?.filter(a => a.source_type === 'recording').length || 0})
            </Button>
            <Button
              variant={selectedSourceType === 'generated' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setSelectedSourceType('generated');
                setSelectedFolder(null);
                setShowFavorites(false);
              }}
            >
              Сгенерированные ({audioItems?.filter(a => a.source_type === 'generated').length || 0})
            </Button>
          </div>

          {folders.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Папки</p>
              {folders.map(folder => (
                <Button
                  key={folder}
                  variant={selectedFolder === folder ? 'default' : 'ghost'}
                  className="w-full justify-start"
                  onClick={() => {
                    setSelectedFolder(folder);
                    setShowFavorites(false);
                    setSelectedSourceType(null);
                  }}
                >
                  <Folder className="mr-2 h-4 w-4" />
                  {folder}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Audio list */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по аудио..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex-1 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            </div>
          ) : filteredItems?.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <p className="text-muted-foreground mb-4">Нет сохраненного аудио</p>
              <Button
                variant="outline"
                onClick={() => setUploadDialogOpen(true)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Загрузить аудио
              </Button>
            </div>
          ) : (
            <AudioVirtualGrid
              items={filteredItems || []}
              columns={isMobile ? 1 : 3}
              onSelect={setSelectedAudio}
              selectedId={selectedAudio}
            />
          )}
        </div>

        {/* Preview panel */}
        {selectedAudioData && (
          <AudioPreviewPanel
            audio={selectedAudioData}
            onClose={() => setSelectedAudio(null)}
          />
        )}
      </div>
    </div>
  );
}
