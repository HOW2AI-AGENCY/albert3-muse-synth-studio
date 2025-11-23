/**
 * Audio Library Page
 * Sprint 30: Lyrics & Audio Management - Phase 2
 */

import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Star, Folder, Upload, Wand2, History } from 'lucide-react';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { AudioVirtualGrid } from '@/components/audio/AudioVirtualGrid';
import { AudioPreviewPanel } from '@/components/audio/AudioPreviewPanel';
import { AudioUpload } from '@/components/audio/AudioUpload';
import { Skeleton } from '@/components/ui/skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UploadExtendDialog } from '@/components/tracks/UploadExtendDialog';
import { AddInstrumentalDialog } from '@/components/tracks/AddInstrumentalDialog';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const AudioLibrary = () => {
  const [activeTab, setActiveTab] = useState('library');
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300); // ✅ Debounce search
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedSourceType, setSelectedSourceType] = useState<string | null>(null);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [instrumentalDialogOpen, setInstrumentalDialogOpen] = useState(false);
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
    if (!debouncedSearchQuery) return audioItems;
    const query = debouncedSearchQuery.toLowerCase();
    return audioItems.filter(item =>
      item.file_name.toLowerCase().includes(query) ||
      (item.description && item.description.toLowerCase().includes(query)) ||
      (item.tags && item.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }, [audioItems, debouncedSearchQuery]);

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="border-b border-border px-4">
          <TabsList className="h-12">
            <TabsTrigger value="library" className="gap-2">
              <Folder className="h-4 w-4" />
              Библиотека
            </TabsTrigger>
            <TabsTrigger value="upload" className="gap-2">
              <Upload className="h-4 w-4" />
              Загрузка
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="h-4 w-4" />
              История
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Library Tab */}
        <TabsContent value="library" className="flex-1 flex m-0">
          {/* Sidebar */}
          <div className="w-64 border-r border-border bg-card p-4">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Фильтры</h2>

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
                    onClick={() => setActiveTab('upload')}
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
        </TabsContent>

        {/* Upload Tab */}
        <TabsContent value="upload" className="flex-1 m-0 p-6">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Расширить аудио трек
                  </CardTitle>
                  <CardDescription>
                    Загрузите аудиофайл и создайте его расширенную версию с сохранением стиля
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Поддержка файлов до 2 минут</li>
                    <li>Сохранение оригинального стиля</li>
                    <li>Настраиваемая точка продолжения</li>
                    <li>Режим с вокалом или инструментал</li>
                  </ul>
                  <Button onClick={() => setExtendDialogOpen(true)} className="w-full">
                    <Upload className="mr-2 h-4 w-4" />
                    Загрузить и расширить
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wand2 className="h-5 w-5" />
                    Добавить инструментал
                  </CardTitle>
                  <CardDescription>
                    Загрузите вокальный трек и сгенерируйте для него инструментальное сопровождение
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Автоматическое создание аранжировки</li>
                    <li>Настройка стилей и жанров</li>
                    <li>Исключение нежелательных элементов</li>
                    <li>Высокое качество AI-генерации</li>
                  </ul>
                  <Button onClick={() => setInstrumentalDialogOpen(true)} className="w-full">
                    <Wand2 className="mr-2 h-4 w-4" />
                    Создать инструментал
                  </Button>
                </CardContent>
              </Card>

              <Card className="md:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Базовая загрузка
                  </CardTitle>
                  <CardDescription>
                    Загрузите аудиофайл для использования в проектах
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AudioUpload onUploadComplete={() => setActiveTab('library')} />
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="flex-1 m-0 p-6">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>История загрузок</CardTitle>
                <CardDescription>
                  Последние загруженные и обработанные аудиофайлы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center py-8">
                  История загрузок будет доступна в следующей версии
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <UploadExtendDialog
        open={extendDialogOpen}
        onOpenChange={setExtendDialogOpen}
        onSuccess={() => {
          setExtendDialogOpen(false);
          setActiveTab('library');
        }}
      />

      <AddInstrumentalDialog
        open={instrumentalDialogOpen}
        onOpenChange={setInstrumentalDialogOpen}
        onSuccess={() => {
          setInstrumentalDialogOpen(false);
          setActiveTab('library');
        }}
      />
    </div>
  );
};

export default AudioLibrary;
