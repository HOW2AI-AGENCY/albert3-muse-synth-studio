import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Music, FileText, Headphones, User } from 'lucide-react';
import TracksTab from './projects/TracksTab';
import LyricsTab from './projects/LyricsTab';
import AudioTab from './projects/AudioTab';
import PersonasTab from './projects/PersonasTab';

type ProjectTab = 'tracks' | 'lyrics' | 'audio' | 'personas';

const Projects = () => {
  const [activeTab, setActiveTab] = useState<ProjectTab>('tracks');

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 border-b border-border/40">
        <h1 className="text-3xl font-bold mb-2">Проекты</h1>
        <p className="text-muted-foreground">
          Управляйте треками, текстами, аудио и персонами
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ProjectTab)} className="flex-1 flex flex-col">
        <div className="px-6 pt-4">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
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
  );
};

export default Projects;
