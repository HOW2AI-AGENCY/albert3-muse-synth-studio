/**
 * Lyrics Library Page
 * Sprint 30: Lyrics & Audio Management
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star, Folder, History, BarChart3 } from 'lucide-react';
import { useSavedLyrics } from '@/hooks/useSavedLyrics';
import { LyricsVirtualGrid } from '@/components/lyrics/LyricsVirtualGrid';
import { LyricsPreviewPanel } from '@/components/lyrics/LyricsPreviewPanel';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useLyricsGenerationLog, useLyricsGenerationStats, type LyricsGenerationLogEntry } from '@/hooks/useLyricsGenerationLog';
import { Badge } from '@/components/ui/badge';

export default function LyricsLibrary() {
  const [activeTab, setActiveTab] = useState('saved');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedLyrics, setSelectedLyrics] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const { data: logs, isLoading: logsLoading } = useLyricsGenerationLog();
  const { data: stats, isLoading: statsLoading } = useLyricsGenerationStats();

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
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-4">
          <TabsList className="h-12">
            <TabsTrigger value="saved" className="gap-2">
              <Star className="h-4 w-4" />
              Сохранённые
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              История генераций
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Статистика
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Saved Tab */}
        <TabsContent value="saved" className="flex-1 flex m-0">
          {/* Sidebar */}
          <div className="w-64 border-r border-border bg-card p-4">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Фильтры</h2>

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
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 m-0 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            <div>
              <h2 className="text-2xl font-bold mb-2">История генераций лирики</h2>
              <p className="text-muted-foreground">
                Все ваши запросы на генерацию текстов песен
              </p>
            </div>

            {logsLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="space-y-4">
                {logs.map((log: LyricsGenerationLogEntry) => (
                  <Card key={log.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base">
                            {log.generated_title || 'Без названия'}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {log.prompt}
                          </CardDescription>
                        </div>
                        <Badge variant={log.status === 'completed' ? 'default' : log.status === 'failed' ? 'destructive' : 'secondary'}>
                          {log.status === 'completed' ? 'Успешно' : log.status === 'failed' ? 'Ошибка' : 'В процессе'}
                        </Badge>
                      </div>
                    </CardHeader>
                    {log.generated_lyrics && (
                      <CardContent>
                        <div className="bg-muted rounded-lg p-4 max-h-48 overflow-y-auto">
                          <pre className="text-sm whitespace-pre-wrap font-mono">
                            {log.generated_lyrics.slice(0, 200)}
                            {log.generated_lyrics.length > 200 && '...'}
                          </pre>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(log.created_at).toLocaleString('ru-RU')}
                        </p>
                      </CardContent>
                    )}
                    {log.error_message && (
                      <CardContent>
                        <p className="text-sm text-destructive">{log.error_message}</p>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    История генераций пуста
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Stats Tab */}
        <TabsContent value="stats" className="flex-1 m-0 p-6 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Статистика</h2>
              <p className="text-muted-foreground">
                Аналитика по генерации лирики
              </p>
            </div>

            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : stats ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Всего генераций
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">{stats.total}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Успешных
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% успеха
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      С ошибками
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-destructive">{stats.failed}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.total > 0 ? Math.round((stats.failed / stats.total) * 100) : 0}% ошибок
                    </p>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Нет данных</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}