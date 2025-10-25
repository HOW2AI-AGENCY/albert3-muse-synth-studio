/**
 * Audio Preview Panel Component
 * Sprint 30: Lyrics & Audio Management - Phase 2
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { X, Download, Star, Play } from 'lucide-react';
import { AudioLibraryItem, useAudioLibrary } from '@/hooks/useAudioLibrary';

interface AudioPreviewPanelProps {
  audio: AudioLibraryItem;
  onClose: () => void;
}

export const AudioPreviewPanel = React.memo<AudioPreviewPanelProps>(({ 
  audio, 
  onClose 
}) => {
  const { toggleFavorite } = useAudioLibrary();

  const handleDownload = () => {
    window.open(audio.file_url, '_blank');
  };

  const handleToggleFavorite = () => {
    toggleFavorite.mutate({ id: audio.id, isFavorite: audio.is_favorite });
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Неизвестно';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return 'Неизвестно';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(2) + ' MB';
  };

  const getSourceTypeLabel = (type: string) => {
    switch (type) {
      case 'upload': return 'Загружено';
      case 'recording': return 'Запись';
      case 'generated': return 'Сгенерировано';
      default: return type;
    }
  };

  const getAnalysisStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидание';
      case 'processing': return 'Обработка';
      case 'completed': return 'Завершено';
      case 'failed': return 'Ошибка';
      default: return status;
    }
  };

  return (
    <div className="w-96 border-l border-border bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <h2 className="text-lg font-semibold line-clamp-2">{audio.file_name}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Audio player */}
          <div className="space-y-2">
            <audio controls className="w-full" src={audio.file_url}>
              Ваш браузер не поддерживает аудио элемент.
            </audio>
          </div>

          {/* Basic info */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Информация</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Источник:</span>
                <span>{getSourceTypeLabel(audio.source_type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Длительность:</span>
                <span>{formatDuration(audio.duration_seconds)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Размер файла:</span>
                <span>{formatFileSize(audio.file_size)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Анализ:</span>
                <Badge variant="secondary">
                  {getAnalysisStatusLabel(audio.analysis_status)}
                </Badge>
              </div>
            </div>
          </div>

          {/* Description */}
          {audio.description && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Описание</p>
              <p className="text-sm text-muted-foreground">{audio.description}</p>
            </div>
          )}

          {/* Tags */}
          {audio.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Теги</p>
              <div className="flex flex-wrap gap-2">
                {audio.tags.map(tag => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Folder */}
          {audio.folder && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Папка</p>
              <Badge variant="outline">{audio.folder}</Badge>
            </div>
          )}

          {/* Analysis data */}
          {audio.analysis_data && audio.analysis_status === 'completed' && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Анализ аудио</p>
              <div className="space-y-1 text-sm">
                {audio.analysis_data.tempo && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Темп:</span>
                    <span>{audio.analysis_data.tempo} BPM</span>
                  </div>
                )}
                {audio.analysis_data.key && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Тональность:</span>
                    <span>{audio.analysis_data.key}</span>
                  </div>
                )}
                {audio.analysis_data.genre && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Жанр:</span>
                    <span>{audio.analysis_data.genre}</span>
                  </div>
                )}
                {audio.analysis_data.mood && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Настроение:</span>
                    <span>{audio.analysis_data.mood}</span>
                  </div>
                )}
                {audio.analysis_data.instruments && audio.analysis_data.instruments.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground">Инструменты:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {audio.analysis_data.instruments.map((instrument, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {instrument}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Usage stats */}
          {audio.usage_count > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Использование</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Play className="h-4 w-4" />
                Использовано {audio.usage_count} раз
              </div>
              {audio.last_used_at && (
                <p className="text-xs text-muted-foreground">
                  Последний раз: {new Date(audio.last_used_at).toLocaleString('ru')}
                </p>
              )}
            </div>
          )}

          {/* Source metadata */}
          {audio.source_metadata && Object.keys(audio.source_metadata).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Метаданные источника</p>
              <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                {JSON.stringify(audio.source_metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Actions */}
      <div className="p-4 border-t border-border space-y-2">
        <Button
          variant="default"
          className="w-full"
          onClick={handleDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Скачать
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleToggleFavorite}
        >
          <Star className={audio.is_favorite ? "mr-2 h-4 w-4 fill-current" : "mr-2 h-4 w-4"} />
          {audio.is_favorite ? 'Удалить из избранного' : 'В избранное'}
        </Button>
      </div>
    </div>
  );
});

AudioPreviewPanel.displayName = 'AudioPreviewPanel';
