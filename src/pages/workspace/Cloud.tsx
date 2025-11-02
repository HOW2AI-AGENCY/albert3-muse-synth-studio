/**
 * ☁️ Cloud Storage - Unified File Management
 * Единое хранилище файлов с категориями: Audio / Samples / Effects / Beats
 */

import { useState } from 'react';
import { Cloud as CloudIcon, Plus, Folder } from '@/utils/iconImports';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/layout/PageHeader';
import { CloudSidebar } from './cloud/CloudSidebar';
import { CloudFileGrid } from './cloud/CloudFileGrid';
import { CreateFolderDialog } from './cloud/CreateFolderDialog';
import { AudioUpload } from '@/components/audio/AudioUpload';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type CloudCategory = 'audio' | 'sample' | 'effect' | 'beat';

export default function Cloud() {
  const [activeTab, setActiveTab] = useState<CloudCategory>('audio');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { items, isLoading } = useAudioLibrary({
    folder: selectedFolder || undefined,
  });

  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-6">
        <PageHeader
          title="Облако"
          description="Единое хранилище аудиофайлов с категориями"
          icon={CloudIcon}
        />
        <div className="flex gap-2">
          <Button onClick={() => setIsCreateFolderOpen(true)} variant="outline" className="gap-2">
            <Folder className="h-4 w-4" />
            <span className="hidden sm:inline">Создать папку</span>
          </Button>
          <Button onClick={() => setIsUploadOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Загрузить файл</span>
            <span className="sm:hidden">Загрузить</span>
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-12rem)] gap-4 mt-6">
        {/* Sidebar with folders */}
        <CloudSidebar
          category={activeTab}
          selectedFolder={selectedFolder}
          onSelectFolder={setSelectedFolder}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as CloudCategory)} className="flex-1 flex flex-col">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="audio" className="flex-1">
                🎵 Аудио
              </TabsTrigger>
              <TabsTrigger value="sample" className="flex-1">
                🎹 Семплы
              </TabsTrigger>
              <TabsTrigger value="effect" className="flex-1">
                🎛️ Эффекты
              </TabsTrigger>
              <TabsTrigger value="beat" className="flex-1">
                🥁 Биты
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 mt-4">
              <CloudFileGrid
                items={items || []}
                isLoading={isLoading}
                category={activeTab}
                selectedFolder={selectedFolder}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={isCreateFolderOpen}
        onOpenChange={setIsCreateFolderOpen}
        category={activeTab}
      />

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Загрузить аудиофайл</DialogTitle>
          </DialogHeader>
          <AudioUpload />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
