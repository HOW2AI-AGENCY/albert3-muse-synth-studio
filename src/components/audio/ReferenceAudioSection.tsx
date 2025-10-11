import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Mic } from 'lucide-react';
import { AudioUploader } from './AudioUploader';
import { AudioRecorder } from './AudioRecorder';

interface ReferenceAudioSectionProps {
  onReferenceChange?: (url: string | null) => void;
  className?: string;
}

export const ReferenceAudioSection = ({
  onReferenceChange,
  className,
}: ReferenceAudioSectionProps) => {
  const [mode, setMode] = useState<'upload' | 'record'>('upload');

  const handleAudioComplete = (url: string) => {
    onReferenceChange?.(url);
  };

  const handleRemove = () => {
    onReferenceChange?.(null);
  };

  return (
    <Tabs value={mode} onValueChange={(v) => setMode(v as 'upload' | 'record')} className={className}>
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="upload">
          <Upload className="w-4 h-4 mr-2" />
          Загрузить
        </TabsTrigger>
        <TabsTrigger value="record">
          <Mic className="w-4 h-4 mr-2" />
          Записать
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
    </Tabs>
  );
};
