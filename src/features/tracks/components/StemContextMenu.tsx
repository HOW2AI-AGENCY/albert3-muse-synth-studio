import { useState } from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Download, FileAudio, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import { useConvertToWav } from '@/hooks/useConvertToWav';

interface TrackStem {
  id: string;
  stem_type: string;
  audio_url: string;
  separation_mode: string;
  track_id: string;
}

interface StemContextMenuProps {
  stem: TrackStem;
  trackTitle?: string;
  onUseAsReference?: (audioUrl: string, stemType: string) => void;
  children: React.ReactNode;
}

export const StemContextMenu = ({ 
  stem, 
  trackTitle, 
  onUseAsReference,
  children 
}: StemContextMenuProps) => {
  const { convertToWav, isConverting } = useConvertToWav();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadMP3 = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch(stem.audio_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${trackTitle || 'track'}_${stem.stem_type}.mp3`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`Стем "${stem.stem_type}" скачан`);
    } catch (error) {
      console.error('Failed to download stem:', error);
      toast.error('Ошибка скачивания стема');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleConvertToWav = async () => {
    try {
      await convertToWav({
        trackId: stem.track_id,
        audioId: stem.id,
      });
    } catch (error) {
      console.error('Failed to convert stem:', error);
      toast.error('Ошибка конвертации стема');
    }
  };

  const handleUseAsReference = () => {
    onUseAsReference?.(stem.audio_url, stem.stem_type);
    toast.success(`Стем "${stem.stem_type}" установлен как референс`);
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={handleDownloadMP3} disabled={isDownloading}>
          <Download className="w-4 h-4 mr-2" />
          {isDownloading ? 'Скачивание...' : 'Скачать MP3'}
        </ContextMenuItem>
        <ContextMenuItem onClick={handleConvertToWav} disabled={isConverting}>
          <FileAudio className="w-4 h-4 mr-2" />
          {isConverting ? 'Конвертация...' : 'Конвертировать в WAV'}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={handleUseAsReference}>
          <Music2 className="w-4 h-4 mr-2" />
          Использовать как референс
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
