/**
 * Cloud File Grid - File Display (Mobile Optimized)
 * Отображение файлов в облаке
 */

import { useState } from 'react';
import { FileAudio, Star, Download, Trash2, MoreVertical, Play } from '@/utils/iconImports';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface CloudFileGridProps {
  items: any[];
  isLoading: boolean;
  category: string;
  selectedFolder: string | null;
}

export function CloudFileGrid({ items, isLoading, selectedFolder }: CloudFileGridProps) {
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const { toggleFavorite, deleteAudio } = useAudioLibrary({});
  const isMobile = useIsMobile();

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
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
          <Skeleton key={i} className={isMobile ? "h-32" : "h-48"} />
        ))}
      </div>
    );
  }

  if (!items || items.length === 0) {
    return (
      <Card className={cn(
        isMobile ? "p-6" : "p-12"
      )}>
        <div className="flex flex-col items-center justify-center text-center">
          <FileAudio className={cn(
            "text-muted-foreground mb-4",
            isMobile ? "h-8 w-8" : "h-12 w-12"
          )} />
          <h3 className={cn(
            "font-medium mb-2",
            isMobile ? "text-base" : "text-lg"
          )}>
            Нет файлов
          </h3>
          <p className="text-sm text-muted-foreground">
            {selectedFolder
              ? 'В этой папке пока нет файлов'
              : 'Загрузите первый файл в эту категорию'}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Files Grid */}
      <div className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-1" : "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      )}>
        {items.map(item => (
          <Card
            key={item.id}
            className="group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50"
            onClick={() => setSelectedAudio(item.id)}
          >
            <CardContent className={cn(
              isMobile ? "p-3" : "p-4"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className={cn(
                    "font-medium truncate",
                    isMobile && "text-sm"
                  )}>
                    {item.file_name}
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ru })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      isMobile ? "h-8 w-8" : "h-8 w-8"
                    )}
                    onClick={(e) => handleToggleFavorite(e, item.id, item.is_favorite)}
                  >
                    <Star
                      className={cn(
                        "h-4 w-4",
                        item.is_favorite && 'fill-yellow-400 text-yellow-400'
                      )}
                    />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { 
                        e.stopPropagation(); 
                        window.open(item.file_url, '_blank'); 
                      }}>
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

              {/* Audio Icon or Play Button */}
              <div className={cn(
                "flex items-center justify-center bg-accent/50 rounded-lg mb-3 relative group/play",
                isMobile ? "h-16" : "h-24"
              )}>
                <FileAudio className={cn(
                  "text-muted-foreground",
                  isMobile ? "h-8 w-8" : "h-12 w-12"
                )} />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/play:opacity-100 transition-opacity">
                  <Button
                    variant="default"
                    size={isMobile ? "sm" : "default"}
                    className="rounded-full"
                  >
                    <Play className={cn(
                      isMobile ? "h-4 w-4" : "h-5 w-5"
                    )} />
                  </Button>
                </div>
              </div>

              {/* Metadata */}
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {item.bpm && (
                    <Badge variant="outline" className="text-xs">
                      {item.bpm} BPM
                    </Badge>
                  )}
                  {item.key && (
                    <Badge variant="outline" className="text-xs">
                      {item.key}
                    </Badge>
                  )}
                </div>
                {item.duration && (
                  <p className="text-xs text-muted-foreground">
                    {Math.floor(item.duration / 60)}:{(item.duration % 60).toString().padStart(2, '0')}
                  </p>
                )}
                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags.slice(0, isMobile ? 2 : 3).map((tag: string) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {item.tags.length > (isMobile ? 2 : 3) && (
                      <Badge variant="secondary" className="text-xs">
                        +{item.tags.length - (isMobile ? 2 : 3)}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Panel - Desktop Sidebar / Mobile Sheet */}
      {selectedAudioData && (
        isMobile ? (
          <Sheet open={!!selectedAudio} onOpenChange={(open) => !open && setSelectedAudio(null)}>
            <SheetContent side="bottom" className="h-[80vh]">
              <SheetHeader>
                <SheetTitle>Предпросмотр</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <AudioPreviewPanel
                  audio={selectedAudioData}
                  onClose={() => setSelectedAudio(null)}
                />
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <div className="fixed right-4 top-20 w-80 z-10">
            <AudioPreviewPanel
              audio={selectedAudioData}
              onClose={() => setSelectedAudio(null)}
            />
          </div>
        )
      )}
    </>
  );
}
