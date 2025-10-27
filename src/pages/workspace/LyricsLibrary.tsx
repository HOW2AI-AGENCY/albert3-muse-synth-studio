/**
 * Lyrics Library Page
 * Sprint 30: Lyrics & Audio Management
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star, Folder } from 'lucide-react';
import { useSavedLyrics } from '@/hooks/useSavedLyrics';
import { LyricsVirtualGrid } from '@/components/lyrics/LyricsVirtualGrid';
import { LyricsPreviewPanel } from '@/components/lyrics/LyricsPreviewPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';

export default function LyricsLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedLyrics, setSelectedLyrics] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const { lyrics, isLoading } = useSavedLyrics({
    search: searchQuery || undefined,
    folder: selectedFolder || undefined,
    favorite: showFavorites,
  });

  const folders = React.useMemo(() => {
    if (!lyrics) return [];
    const folderSet = new Set(lyrics.filter(l => l.folder).map(l => l.folder!));
    return Array.from(folderSet);
  }, [lyrics]);

  const selectedLyricsData = React.useMemo(() => {
    return lyrics?.find(l => l.id === selectedLyrics);
  }, [lyrics, selectedLyrics]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r border-border bg-card p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Библиотека лирики</h2>
          </div>

          <div className="space-y-2">
            <Button
              variant={!selectedFolder && !showFavorites ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setSelectedFolder(null);
                setShowFavorites(false);
              }}
            >
              <Folder className="mr-2 h-4 w-4" />
              Все ({lyrics?.length || 0})
            </Button>

            <Button
              variant={showFavorites ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => {
                setShowFavorites(true);
                setSelectedFolder(null);
              }}
            >
              <Star className="mr-2 h-4 w-4" />
              Избранное ({lyrics?.filter(l => l.is_favorite).length || 0})
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
        {/* Lyrics list */}
        <div className="flex-1 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по лирике..."
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
          ) : lyrics?.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-muted-foreground">Нет сохраненной лирики</p>
            </div>
          ) : (
            <LyricsVirtualGrid
              lyrics={lyrics || []}
              columns={isMobile ? 1 : 3}
              onSelect={setSelectedLyrics}
              selectedId={selectedLyrics}
            />
          )}
        </div>

        {/* Preview panel */}
        {selectedLyricsData && (
          <LyricsPreviewPanel
            lyrics={selectedLyricsData}
            onClose={() => setSelectedLyrics(null)}
          />
        )}
      </div>
    </div>
  );
}