/**
 * Cloud File Grid - File Display
 * Отображение файлов в облаке
 */

import { useState } from 'react';
import { FileAudio, Star, Download, Trash2, MoreVertical } from '@/utils/iconImports';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AudioPreviewPanel } from '@/components/audio/AudioPreviewPanel';
import { useAudioLibrary } from '@/hooks/useAudioLibrary';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface CloudFileGridProps {
  items: any[];
  isLoading: boolean;
  category: string;
  selectedFolder: string | null;
}

export function CloudFileGrid({ items, isLoading, selectedFolder }: CloudFileGridProps) {
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const { toggleFavorite, deleteAudio } = useAudioLibrary({});

  const handleToggleFavorite = (e: React.MouseEvent, id: string, isFavorite: boolean) => {
    e.stopPropagation();
    toggleFavorite.mutate({ id, isFavorite });
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('Удалить этот файл?')) {
      deleteAudio.mutate(id);
    }
  };

  const selectedAudioData = items.find(item => item.id === selectedAudio);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card className="p-12">
        <div className="flex flex-col items-center justify-center text-center">
          <FileAudio className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">Нет файлов</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {selectedFolder
              ? 'В этой папке пока нет файлов'
              : 'Загрузите первый файл в эту категорию'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 h-full">
      {/* Files Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map(item => (
            <Card
              key={item.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50"
              onClick={() => setSelectedAudio(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium truncate">{item.file_name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => handleToggleFavorite(e, item.id, item.is_favorite)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          item.is_favorite ? 'fill-yellow-400 text-yellow-400' : ''
                        }`}
                      />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); window.open(item.file_url, '_blank'); }}>
                          <Download className="h-4 w-4 mr-2" />
                          Скачать
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => handleDelete(e, item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Удалить
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Audio Icon */}
                <div className="flex items-center justify-center h-24 bg-accent/50 rounded-lg mb-3">
                  <FileAudio className="h-12 w-12 text-muted-foreground" />
                </div>

                {/* Metadata */}
                <div className="space-y-2">
                  {item.bpm && (
                    <Badge variant="outline" className="text-xs">
                      {item.bpm} BPM
                    </Badge>
                  )}
                  {item.key && (
                    <Badge variant="outline" className="text-xs ml-1">
                      {item.key}
                    </Badge>
                  )}
                  {item.duration && (
                    <p className="text-xs text-muted-foreground">
                      Длительность: {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                    </p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.tags.slice(0, 3).map((tag: string) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{item.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Preview Panel */}
      {selectedAudioData && (
        <div className="w-80">
          <AudioPreviewPanel
            audio={selectedAudioData}
            onClose={() => setSelectedAudio(null)}
          />
        </div>
      )}
    </div>
  );
}
