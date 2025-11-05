import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Music, Play, Check, Loader2, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { cn } from '@/lib/utils';

interface ReferenceAudio {
  id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  duration?: number;
  created_at: string;
}

interface ReferenceAudioLibraryProps {
  onSelect: (audio: { url: string; fileName: string }) => void;
  selectedUrl?: string | null;
  /** ✅ НОВОЕ: Callback для запуска анализа после выбора */
  onAnalyze?: (audioUrl: string) => void;
}

export function ReferenceAudioLibrary({ onSelect, selectedUrl, onAnalyze }: ReferenceAudioLibraryProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch user's reference audio files from storage
  const { data: audioFiles, isLoading, refetch } = useQuery({
    queryKey: ['reference-audio-library'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      // List files from storage bucket
      const { data: files, error } = await supabase.storage
        .from('reference-audio')
        .list(user.id, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) throw error;

      // Get public URLs for all files
      const audioFiles: ReferenceAudio[] = files
        .filter(file => !file.name.endsWith('.emptyFolderPlaceholder'))
        .map(file => {
          const { data: { publicUrl } } = supabase.storage
            .from('reference-audio')
            .getPublicUrl(`${user.id}/${file.name}`);

          return {
            id: file.id,
            file_name: file.name,
            file_url: publicUrl,
            file_size: file.metadata?.size || 0,
            created_at: file.created_at,
          };
        });

      logger.info('📚 [REFERENCE-LIBRARY] Loaded files', 'ReferenceAudioLibrary', {
        count: audioFiles.length
      });

      return audioFiles;
    },
    staleTime: 30000, // 30 seconds
  });

  const handlePlay = (id: string) => {
    setPlayingId(playingId === id ? null : id);
  };

  const handleSelect = (audio: ReferenceAudio) => {
    logger.info('✅ [REFERENCE-LIBRARY] Selected audio', 'ReferenceAudioLibrary', {
      fileName: audio.file_name,
      size: audio.file_size
    });
    onSelect({ url: audio.file_url, fileName: audio.file_name });
    
    // ✅ КРИТИЧНО: Запустить анализ через Mureka
    onAnalyze?.(audio.file_url);
    
    toast.success('Аудио выбрано из библиотеки');
  };

  const handleDelete = async (audio: ReferenceAudio) => {
    try {
      setDeletingId(audio.id);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Unauthorized');

      const { error } = await supabase.storage
        .from('reference-audio')
        .remove([`${user.id}/${audio.file_name}`]);

      if (error) throw error;

      logger.info('🗑️ [REFERENCE-LIBRARY] Deleted audio', 'ReferenceAudioLibrary', {
        fileName: audio.file_name
      });

      toast.success('Аудио удалено из библиотеки');
      refetch();
    } catch (error) {
      logger.error('[REFERENCE-LIBRARY] Delete failed', error instanceof Error ? error : new Error(String(error)), 'ReferenceAudioLibrary');
      toast.error('Не удалось удалить аудио');
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!audioFiles || audioFiles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <Music className="h-12 w-12 text-muted-foreground/50 mb-3" />
        <p className="text-sm font-medium text-muted-foreground">
          Библиотека пуста
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Загрузите аудио файлы, они сохранятся здесь
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[300px] sm:h-[400px] pr-4">
      <div className="space-y-2">
        {audioFiles.map((audio) => {
          const isSelected = selectedUrl === audio.file_url;
          const isPlaying = playingId === audio.id;
          const isDeleting = deletingId === audio.id;

          return (
            <div
              key={audio.id}
              className={cn(
                "group relative p-3 rounded-lg border transition-all",
                isSelected
                  ? "bg-primary/5 border-primary/30"
                  : "bg-secondary/10 border-border/40 hover:bg-secondary/20 hover:border-border/60"
              )}
            >
              <div className="flex items-start gap-3">
                {/* Play Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => handlePlay(audio.id)}
                >
                  <Play className="h-4 w-4" />
                </Button>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {audio.file_name.replace(/^\d+\./, '')}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(audio.file_size)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(audio.created_at), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Select Button */}
                    {isSelected ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary">
                        <Check className="h-3 w-3" />
                        <span className="text-xs font-medium">Выбрано</span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSelect(audio)}
                        className="text-xs"
                      >
                        Выбрать
                      </Button>
                    )}
                  </div>

                  {/* Audio Player (when playing) */}
                  {isPlaying && (
                    <audio
                      controls
                      src={audio.file_url}
                      className="w-full h-8 mt-2"
                      autoPlay
                    />
                  )}
                </div>

                {/* Delete Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDelete(audio)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}
