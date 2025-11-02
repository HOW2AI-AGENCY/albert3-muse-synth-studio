/**
 * ☁️ Cloud Storage - Unified File Management (Mobile Optimized)
 * Единое хранилище файлов с категориями: Audio / Samples / Effects / Beats
 */

import { useState } from 'react';
import { Cloud as CloudIcon, Plus, Folder, Menu } from '@/utils/iconImports';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

type CloudCategory = 'audio' | 'sample' | 'effect' | 'beat';

export default function Cloud() {
  const [activeTab, setActiveTab] = useState<CloudCategory>('audio');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const { items, isLoading } = useAudioLibrary({
    folder: selectedFolder || undefined,
  });

  const categoryEmojis = {
    audio: '🎵',
    sample: '🎹',
    effect: '🎛️',
    beat: '🥁',
  };

  const categoryLabels = {
    audio: 'Аудио',
    sample: 'Семплы',
    effect: 'Эффекты',
    beat: 'Биты',
  };

  return (
    <PageContainer>
      {/* Mobile Header */}
      <div className={cn(
        "flex items-center justify-between gap-2",
        isMobile ? "mb-4" : "mb-6"
      )}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isMobile && (
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="shrink-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="p-4 border-b">
                  <SheetTitle>Папки</SheetTitle>
                </SheetHeader>
                <CloudSidebar
                  category={activeTab}
                  selectedFolder={selectedFolder}
                  onSelectFolder={(folderId) => {
                    setSelectedFolder(folderId);
                    setIsSidebarOpen(false);
                  }}
                />
              </SheetContent>
            </Sheet>
          )}
          
          <PageHeader
            title={isMobile ? "Облако" : "Облако"}
            description={isMobile ? undefined : "Единое хранилище аудиофайлов"}
            icon={CloudIcon}
          />
        </div>

        <div className="flex gap-2 shrink-0">
          <Button 
            onClick={() => setIsCreateFolderOpen(true)} 
            variant="outline" 
            size={isMobile ? "icon" : "default"}
            className="gap-2"
          >
            <Folder className="h-4 w-4" />
            {!isMobile && <span>Создать папку</span>}
          </Button>
          <Button 
            onClick={() => setIsUploadOpen(true)} 
            size={isMobile ? "icon" : "default"}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            {!isMobile && <span>Загрузить</span>}
          </Button>
        </div>
      </div>

      <div className={cn(
        "flex gap-4",
        isMobile ? "flex-col h-auto" : "h-[calc(100vh-12rem)]"
      )}>
        {/* Desktop Sidebar */}
        {!isMobile && (
          <CloudSidebar
            category={activeTab}
            selectedFolder={selectedFolder}
            onSelectFolder={setSelectedFolder}
          />
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col">
          <Tabs 
            value={activeTab} 
            onValueChange={(v) => setActiveTab(v as CloudCategory)} 
            className="flex-1 flex flex-col"
          >
            <TabsList className={cn(
              "w-full justify-start",
              isMobile && "grid grid-cols-4 gap-1"
            )}>
              {(['audio', 'sample', 'effect', 'beat'] as CloudCategory[]).map((category) => (
                <TabsTrigger 
                  key={category}
                  value={category} 
                  className={cn(
                    "flex-1",
                    isMobile && "flex flex-col gap-1 h-auto py-2"
                  )}
                >
                  <span className={isMobile ? "text-xl" : undefined}>
                    {categoryEmojis[category]}
                  </span>
                  {isMobile ? (
                    <span className="text-xs">{categoryLabels[category]}</span>
                  ) : (
                    <span>{categoryLabels[category]}</span>
                  )}
                </TabsTrigger>
              ))}
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
        <DialogContent className={cn(
          isMobile ? "max-w-[95vw] h-[90vh]" : "max-w-2xl"
        )}>
          <DialogHeader>
            <DialogTitle>Загрузить аудиофайл</DialogTitle>
          </DialogHeader>
          <AudioUpload />
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}
