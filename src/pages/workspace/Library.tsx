import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Search, 
  Filter, 
  Music, 
  RefreshCcw, 
  Grid3X3, 
  List,
  SortAsc,
  SortDesc
} from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { TrackListItem } from "@/components/tracks/TrackListItem";
import { OptimizedTrackList } from "@/components/OptimizedTrackList";
import { LoadingSkeleton } from "@/components/ui/LoadingSkeleton";
import { useTracks } from "@/hooks/useTracks";
import { useToast } from "@/hooks/use-toast";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { DisplayTrack, convertToDisplayTrack, convertToOptimizedTrack } from "@/types/track";
import { cn } from "@/lib/utils";

type ViewMode = 'grid' | 'list' | 'optimized';
type SortBy = 'created_at' | 'title' | 'duration' | 'like_count';
type SortOrder = 'asc' | 'desc';

const Library: React.FC = () => {
  const { tracks, isLoading, refreshTracks } = useTracks();
  const { toast } = useToast();
  const { playTrackWithQueue } = useAudioPlayer();
  
  // Состояние UI
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('library-view-mode');
    return (saved as ViewMode) || 'grid';
  });
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortBy>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Сохранение настроек просмотра
  useEffect(() => {
    localStorage.setItem('library-view-mode', viewMode);
  }, [viewMode]);

  // Мемоизированная фильтрация и сортировка треков
  const filteredAndSortedTracks = useMemo(() => {
    let filtered = tracks.filter(track => {
      const matchesSearch = !searchQuery || 
        track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (track.style_tags && track.style_tags.some(tag => 
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      
      const matchesStatus = selectedStatus === 'all' || track.status === selectedStatus;
      
      return matchesSearch && matchesStatus;
    });

    // Сортировка
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        case 'duration':
          aValue = a.duration || 0;
          bValue = b.duration || 0;
          break;
        case 'like_count':
          aValue = a.like_count || 0;
          bValue = b.like_count || 0;
          break;
        case 'created_at':
        default:
          aValue = new Date(a.created_at || 0).getTime();
          bValue = new Date(b.created_at || 0).getTime();
          break;
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [tracks, searchQuery, selectedStatus, sortBy, sortOrder]);

  // Обработчики событий
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  const handleSortChange = useCallback((newSortBy: SortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  }, [sortBy]);

  const handleTrackPlay = useCallback((track: DisplayTrack) => {
    if (track.audio_url && track.status === 'completed') {
      playTrackWithQueue({
        id: track.id,
        title: track.title,
        audio_url: track.audio_url,
        cover_url: track.cover_url,
        duration: track.duration,
        style_tags: track.style_tags || []
      }, filteredAndSortedTracks.map(t => ({
        id: t.id,
        title: t.title,
        audio_url: t.audio_url || '',
        cover_url: t.cover_url,
        duration: t.duration,
        style_tags: t.style_tags || []
      })));
    }
  }, [playTrackWithQueue, filteredAndSortedTracks]);

  const handleLike = useCallback((trackId: string) => {
    // TODO: Реализовать функцию лайка
    toast({
      title: "Функция в разработке",
      description: "Лайки будут добавлены в следующем обновлении",
    });
  }, [toast]);

  const handleDownload = useCallback((trackId: string) => {
    // TODO: Реализовать функцию скачивания
    toast({
      title: "Функция в разработке", 
      description: "Скачивание будет добавлено в следующем обновлении",
    });
  }, [toast]);

  const handleShare = useCallback((trackId: string) => {
    // TODO: Реализовать функцию шаринга
    toast({
      title: "Функция в разработке",
      description: "Шаринг будет добавлен в следующем обновлении",
    });
  }, [toast]);

  // Уникальные статусы для фильтра
  const availableStatuses = useMemo(() => {
    const statuses = new Set(tracks.map(track => track.status));
    return Array.from(statuses);
  }, [tracks]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <LoadingSkeleton width="200px" height="32px" />
          <LoadingSkeleton width="120px" height="32px" />
        </div>
        
        <div className="flex gap-4">
          <LoadingSkeleton width="300px" height="40px" />
          <LoadingSkeleton width="100px" height="40px" />
        </div>

        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="rectangular" height="300px" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <LoadingSkeleton key={i} variant="track-item" />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in" role="main" aria-label="Библиотека треков">
      {/* Заголовок и статистика */}
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl">
            <Music className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gradient-primary">
              Библиотека
            </h1>
            <p className="text-muted-foreground mt-1">
              {tracks.length} {tracks.length === 1 ? "трек" : "треков"} всего
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="glass"
            size="sm"
            onClick={refreshTracks}
            aria-label="Обновить список треков"
            className="hover:scale-105 transition-all duration-300"
          >
            <RefreshCcw className="h-4 w-4" />
          </Button>
          
          {/* Переключатель вида */}
          <div className="flex items-center border border-border/30 rounded-lg p-1 bg-background/50 backdrop-blur-sm">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('grid')}
              aria-label="Сетка"
              className="transition-all duration-300"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('list')}
              aria-label="Список"
              className="transition-all duration-300"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'optimized' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleViewModeChange('optimized')}
              aria-label="Оптимизированный список"
              className="transition-all duration-300"
            >
              <Music className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <Card variant="modern" className="animate-scale-in" style={{ animationDelay: '0.1s' }}>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Поиск */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-primary animate-pulse" />
              <Input
                placeholder="Поиск по названию или тегам..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-background/50 backdrop-blur-sm border-primary/20 focus:border-primary/50 transition-all duration-300"
                aria-label="Поиск треков"
              />
            </div>
            
            {/* Фильтр по статусу */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-border/30 rounded-md bg-background/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/20"
              aria-label="Фильтр по статусу"
            >
              <option value="all">Все статусы</option>
              {availableStatuses.map(status => (
                <option key={status} value={status}>
                  {status === 'completed' ? 'Завершено' : 
                   status === 'processing' ? 'Обработка' : 
                   status === 'pending' ? 'Ожидание' : status}
                </option>
              ))}
            </select>
            
            {/* Сортировка */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('created_at')}
                className={cn(
                  sortBy === 'created_at' && 'bg-primary/10 border-primary/50',
                  "hover:scale-105 transition-all duration-300"
                )}
              >
                Дата {sortBy === 'created_at' && (sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />)}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSortChange('title')}
                className={cn(
                  sortBy === 'title' && 'bg-primary/10 border-primary/50',
                  "hover:scale-105 transition-all duration-300"
                )}
              >
                Название {sortBy === 'title' && (sortOrder === 'asc' ? <SortAsc className="ml-1 h-3 w-3" /> : <SortDesc className="ml-1 h-3 w-3" />)}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список треков */}
      {filteredAndSortedTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <div className="relative mb-6 animate-float">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full blur-2xl" />
            <div className="relative p-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 backdrop-blur-xl border border-primary/20">
              <Music className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h3 className="text-3xl font-black mb-3 text-gradient-primary">
            {searchQuery ? 'Треки не найдены' : 'Библиотека пуста'}
          </h3>
          <p className="text-muted-foreground max-w-md text-lg">
            {searchQuery 
              ? 'Попробуйте изменить поисковый запрос или фильтры'
              : 'Создайте свой первый AI-трек в разделе "Генерация"'
            }
          </p>
        </div>
      ) : (
        <>
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedTracks.map((track) => (
                <TrackCard
                  key={track.id}
                  track={track}
                  onClick={() => handleTrackPlay(convertToDisplayTrack(track))}
                  onDownload={() => handleDownload(track.id)}
                  onShare={() => handleShare(track.id)}
                />
              ))}
            </div>
          )}
          
          {viewMode === 'list' && (
            <div className="space-y-2">
              {filteredAndSortedTracks.map((track, index) => (
                <TrackListItem
                  key={track.id}
                  track={convertToDisplayTrack(track)}
                  index={index}
                  onDownload={() => handleDownload(track.id)}
                  onShare={() => handleShare(track.id)}
                  onClick={() => handleTrackPlay(convertToDisplayTrack(track))}
                />
              ))}
            </div>
          )}
          
          {viewMode === 'optimized' && (
            <OptimizedTrackList
              tracks={filteredAndSortedTracks.map(convertToOptimizedTrack)}
              onDownload={handleDownload}
              onShare={handleShare}
            />
          )}
        </>
      )}
    </div>
  );
};

export default Library;