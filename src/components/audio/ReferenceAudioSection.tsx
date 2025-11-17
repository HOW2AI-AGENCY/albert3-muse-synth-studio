import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Mic, Library } from '@/utils/iconImports';
import { AudioUploader } from './AudioUploader';
import { AudioRecorder } from './AudioRecorder';
import { AudioLibraryBrowser } from './AudioLibraryBrowser';

interface ReferenceAudioSectionProps {
  onReferenceChange?: (url: string | null) => void;
  onAnalysisDataReceived?: (data: Record<string, unknown>) => void;
  className?: string;
}

export const ReferenceAudioSection = ({
  onReferenceChange,
  onAnalysisDataReceived,
  className,
}: ReferenceAudioSectionProps) => {
  const [mode, setMode] = useState<'upload' | 'record' | 'library'>('upload');

  const handleAudioComplete = (url: string) => {
    onReferenceChange?.(url);
  };

  const handleRemove = () => {
    onReferenceChange?.(null);
  };

  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as 'upload' | 'record' | 'library')} className={className}>
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="upload">
          <Upload className="w-4 h-4 mr-2" />
          Загрузить
        </TabsTrigger>
        <TabsTrigger value="record">
          <Mic className="w-4 h-4 mr-2" />
          Записать
        </TabsTrigger>
        <TabsTrigger value="library">
          <Library className="w-4 h-4 mr-2" />
          Библиотека
        </TabsTrigger>
      </TabsList>

      <TabsContent value="upload" className="mt-4">
        <AudioUploader
          onUploadComplete={handleAudioComplete}
          onRemove={handleRemove}
        />
      </TabsContent>

      <TabsContent value="record" className="mt-4">
        <AudioRecorder
          onRecordComplete={handleAudioComplete}
          onRemove={handleRemove}
        />
      </TabsContent>

      <TabsContent value="library" className="mt-4">
        <AudioLibraryBrowser
          onSelect={(item) => {
            handleAudioComplete(item.file_url);
            if (item.analysis_data && typeof item.analysis_data === 'object') {
              onAnalysisDataReceived?.(item.analysis_data as Record<string, unknown>);
            }
          }}
        />
      </TabsContent>
    </Tabs>
  );
};
