/**
 * Projects Hub Component
 * Combines Project Overview, Tracks, Lyrics, Audio, and Personas
 */

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FolderOpen, Music, FileText, Headphones, User } from 'lucide-react';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { ProjectOverview } from './projects/ProjectOverview';
import TracksTab from './projects/TracksTab';
import LyricsTab from './projects/LyricsTab';
import AudioTab from './projects/AudioTab';
import PersonasTab from './projects/PersonasTab';

type ProjectTab = 'overview' | 'tracks' | 'lyrics' | 'audio' | 'personas';

const Projects = () => {
  const [activeTab, setActiveTab] = useState<ProjectTab>('overview');

  return (
    <ProjectProvider>
      <div className="h-full flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border/40">
          <h1 className="text-3xl font-bold mb-2">Проекты</h1>
          <p className="text-muted-foreground">
            Создавайте проекты, управляйте треками и ресурсами
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProjectTab)} className="flex-1 flex flex-col">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-5 max-w-3xl">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Обзор</span>
              </TabsTrigger>
              <TabsTrigger value="tracks" className="flex items-center gap-2">
                <Music className="w-4 h-4" />
                <span className="hidden sm:inline">Треки</span>
              </TabsTrigger>
              <TabsTrigger value="lyrics" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Лирика</span>
              </TabsTrigger>
              <TabsTrigger value="audio" className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                <span className="hidden sm:inline">Аудио</span>
              </TabsTrigger>
              <TabsTrigger value="personas" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">Персоны</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-hidden">
            <TabsContent value="overview" className="h-full m-0 p-0">
              <div className="h-full overflow-y-auto p-6">
                <ProjectOverview />
              </div>
            </TabsContent>
            <TabsContent value="tracks" className="h-full m-0 p-0">
              <TracksTab />
            </TabsContent>
            <TabsContent value="lyrics" className="h-full m-0 p-0">
              <LyricsTab />
            </TabsContent>
            <TabsContent value="audio" className="h-full m-0 p-0">
              <AudioTab />
            </TabsContent>
            <TabsContent value="personas" className="h-full m-0 p-0">
              <PersonasTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </ProjectProvider>
  );
};

export default Projects;
