import React, { useState, useCallback, memo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LazyImage } from "@/components/ui/lazy-image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { fadeInUp } from "@/utils/animations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play,
  Pause,
  Download,
  Heart,
  Share2,
  Clock,
  Music,
  AlertTriangle,
  RefreshCw,
  Trash2,
  MoreVertical,
  Split,
  Expand,
  Mic2,
  Globe,
  FileAudio,
  Star,
  Layers,
  Mic,
  UserPlus,
} from "@/utils/iconImports";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { useTrackLike } from "@/features/tracks/hooks";

import { useTrackVersions } from "@/features/tracks/hooks";
import { withErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { formatDuration } from "@/utils/formatters";
import { TrackProgressBar } from "@/components/tracks/TrackProgressBar";
import { TrackSyncStatus } from "@/components/tracks/TrackSyncStatus";
import { getVersionShortLabel } from "@/utils/versionLabels";
import { useConvertToWav } from "@/hooks/useConvertToWav";
import { TrackVariantSelector } from "./TrackVariantSelector";

// ✅ Компонент для WAV конвертации (использует hook на уровне компонента)
const WavConvertMenuItem: React.FC<{ 
  trackId: string; 
  trackMetadata: Record<string, any> | null | undefined;
}> = ({ trackId, trackMetadata }) => {
  const { convertToWav, isConverting, convertingTrackId } = useConvertToWav();
  
  // ✅ Проверяем провайдер - скрываем для Mureka треков
  const metadata = trackMetadata as Record<string, unknown> | null;
  const isMurekaTrack = metadata?.provider === 'mureka';
  const sunoTaskId = metadata?.suno_task_id as string | undefined;
  
  // Не показывать кнопку для Mureka треков или треков без suno_task_id
  if (isMurekaTrack || !sunoTaskId) {
    return null;
  }
  
  const handleConvert = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isConverting && convertingTrackId === trackId) return;
    await convertToWav({ trackId });
  }, [trackId, convertToWav, isConverting, convertingTrackId]);
  
  return (
    <DropdownMenuItem onClick={handleConvert} disabled={isConverting && convertingTrackId === trackId}>
      <FileAudio className="w-4 h-4 mr-2" />
      {isConverting && convertingTrackId === trackId ? 'Конвертация...' : 'Скачать WAV'}
    </DropdownMenuItem>
  );
};

// Сокращенный интерфейс для карточки
interface Track {
  id: string;
  title: string;
  audio_url?: string;
  cover_url?: string;
  duration?: number;
  status: "pending" | "processing" | "completed" | "failed";
  error_message?: string;
  created_at: string;
  style_tags?: string[];
  like_count?: number;
  view_count?: number;
  prompt?: string;
  progress_percent?: number | null;
  metadata?: Record<string, any> | null;
  is_public?: boolean;
  has_vocals?: boolean;
}

interface TrackCardProps {
  track: Track;
  onShare?: () => void;
  onClick?: () => void;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
  onExtend?: (trackId: string) => void;
  onCover?: (trackId: string) => void;
  onSeparateStems?: (trackId: string) => void;
  onAddVocal?: (trackId: string) => void;
  className?: string;
}

// Упрощенные градиенты
const gradients = [
  "from-purple-500/10 to-pink-500/10",
  "from-blue-500/10 to-cyan-500/10",
  "from-green-500/10 to-emerald-500/10",
  "from-orange-500/10 to-red-500/10",
];

const getGradientByTrackId = (trackId: string) => {
  const index = trackId.charCodeAt(0) % gradients.length;
  return gradients[index];
};

const GenerationProgress: React.FC<{ 
  track: Track; 
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}> = ({ track, onRetry, onDelete }) => {
  const trackForSync = {
    id: track.id,
    status: track.status,
    created_at: track.created_at,
    metadata: track.metadata as Record<string, any> | null | undefined,
  };
  
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-white z-10 text-center transition-opacity duration-300">
      <div className="w-full max-w-[200px]">
        <TrackSyncStatus track={trackForSync} />
      </div>
      
      {(onRetry || onDelete) && (
        <div className="flex gap-2 mt-3">
          {onRetry && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRetry(track.id);
                    }}
                    className="h-8 w-8"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Повторить</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {onDelete && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(track.id);
                    }}
                    className="h-8 w-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Удалить</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      )}
    </div>
  );
};

const FailedState: React.FC<{ 
  message?: string;
  trackId: string;
  onRetry?: (trackId: string) => void;
  onDelete?: (trackId: string) => void;
}> = ({ message, trackId, onRetry, onDelete }) => (
  <div className="absolute inset-0 bg-destructive/70 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-white z-10 text-center">
    <AlertTriangle className="w-6 h-6 mb-2" />
    <h4 className="font-semibold text-sm">Ошибка</h4>
    <p className="text-xs text-destructive-foreground/80 line-clamp-2 mb-3">
      {message || "Не удалось создать трек."}
    </p>
    
    <div className="flex gap-2">
      {onRetry && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="secondary"
                onClick={(e) => {
                  e.stopPropagation();
                  onRetry(trackId);
                }}
                className="h-8 w-8"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Повторить</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {onDelete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                variant="destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(trackId);
                }}
                className="h-8 w-8"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Удалить</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  </div>
);

const TrackCardComponent = ({ track, onShare, onClick, onRetry, onDelete, onExtend, onCover, onSeparateStems, onAddVocal, className }: TrackCardProps) => {
  const { toast } = useToast();
  const { currentTrack, isPlaying, playTrack } = useAudioPlayer();
  
  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const { versions, mainVersion, versionCount, masterVersion } = useTrackVersions(track.id, true);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasStems, setHasStems] = useState(false);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);
  
  // ✅ Определяем провайдер трека
  const isMurekaTrack = track.metadata?.provider === 'mureka';
  const isSunoTrack = !isMurekaTrack;
  
  // ✅ Проверяем наличие стемов
  useEffect(() => {
    const checkStems = async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data } = await supabase
        .from('track_stems')
        .select('id')
        .eq('track_id', track.id)
        .limit(1);
      setHasStems((data?.length || 0) > 0);
    };
    checkStems();
  }, [track.id]);

  const handleTogglePublic = useCallback(async () => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { error } = await supabase
        .from('tracks')
        .update({ is_public: !track.is_public })
        .eq('id', track.id);
      
      if (error) throw error;
      
      toast({
        title: track.is_public ? "Трек скрыт" : "Трек опубликован",
        description: track.is_public 
          ? "Трек теперь виден только вам" 
          : "Трек теперь доступен всем пользователям",
      });
    } catch (error) {
      const { logError } = await import('@/utils/logger');
      logError('Failed to toggle track public status', error as Error, 'TrackCard');
      toast({
        title: "Ошибка",
        description: "Не удалось изменить статус публикации",
        variant: "destructive",
      });
    }
  }, [track.id, track.is_public, toast]);

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = cardRef.current;
    if (element) {
      element.classList.add('animate-fade-in');
    }
    setIsVisible(true);
  }, []);

  // Получаем активную версию
  const allVersions = React.useMemo(() => {
    if (!mainVersion) return [];
    return [mainVersion, ...versions];
  }, [mainVersion, versions]);

  const activeVersion = React.useMemo(() => {
    return allVersions[activeVersionIndex] || mainVersion || {
      id: track.id,
      title: track.title,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      duration: track.duration,
      versionNumber: 0,
      isOriginal: true,
      isMasterVersion: false,
      parentTrackId: track.id,
    };
  }, [allVersions, activeVersionIndex, mainVersion, track]);

  const handleVersionChange = React.useCallback((versionIndex: number) => {
    setActiveVersionIndex(versionIndex);
  }, []);

  const isCurrentTrack = currentTrack?.id === activeVersion.id;
  const playButtonDisabled = track.status !== "completed" || !activeVersion.audio_url;

  const handlePlayClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    if (playButtonDisabled) return;
    
    // Воспроизводим активную версию
    const audioTrack = {
      id: activeVersion.id,
      title: activeVersion.title || track.title,
      audio_url: activeVersion.audio_url || '',
      cover_url: activeVersion.cover_url || track.cover_url,
      duration: activeVersion.duration || track.duration,
      status: "completed" as const,
      style_tags: track.style_tags || [],
      lyrics: activeVersion.lyrics,
      parentTrackId: track.id,
      versionNumber: activeVersion.versionNumber,
      isMasterVersion: activeVersion.isMasterVersion,
      isOriginalVersion: activeVersion.isOriginal,
    };
    
    playTrack(audioTrack);
  }, [playButtonDisabled, activeVersion, track, playTrack]);

  const handleLikeClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    toggleLike();
  }, [toggleLike]);

  const handleDownloadClick = useCallback(async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!activeVersion.audio_url) {
      toast({ title: "Ошибка", description: "Аудиофайл недоступен", variant: "destructive" });
      return;
    }
    
    // Скачиваем активную версию
    const link = document.createElement('a');
    link.href = activeVersion.audio_url;
    link.download = `${activeVersion.title || track.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: "Скачивание начато",
      description: `${activeVersion.title || track.title}`,
    });
  }, [toast, activeVersion, track.title]);

  const handleShareClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    onShare?.();
  }, [onShare]);

  const gradient = getGradientByTrackId(track.id);
  const formattedDuration = activeVersion.duration ? formatDuration(activeVersion.duration) : null;

  return (
    <motion.div
      ref={cardRef}
      variants={fadeInUp}
      initial="initial"
      animate="animate"
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      role="article"
      aria-label={`Трек ${track.title}`}
      tabIndex={0}
    >
      <Card
        className={cn(
          "group relative overflow-hidden cursor-pointer transition-all duration-300",
          "border-border/50 bg-card hover:bg-muted/30 card-elevated",
          isVisible ? "h-full flex flex-col opacity-100" : "h-full flex flex-col opacity-0",
          isCurrentTrack && "ring-2 ring-primary/80 shadow-glow-primary-strong",
          className,
        )}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
      <div className="relative aspect-square bg-gradient-to-br from-gray-800 to-gray-900">
        {(track.status === 'processing' || track.status === 'pending') && (
          <GenerationProgress track={track} onRetry={onRetry} onDelete={onDelete} />
        )}
        {track.status === 'failed' && (
          <FailedState message={track.error_message} trackId={track.id} onRetry={onRetry} onDelete={onDelete} />
        )}

        {/* Vocal/Instrumental badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute top-2 left-2 z-10 bg-background/90 backdrop-blur-sm p-1.5 rounded-md cursor-help">
                {track.has_vocals ? (
                  <Mic className="h-4 w-4 text-primary" />
                ) : (
                  <Music className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {track.has_vocals ? 'С вокалом' : 'Инструментал'}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Variant selector в правом верхнем углу */}
        {track.status === 'completed' && (
          <div className="absolute top-2 right-2 z-10">
            <TrackVariantSelector 
              trackId={track.id} 
              currentVersionIndex={activeVersionIndex}
              onVersionChange={handleVersionChange}
            />
          </div>
        )}

        {activeVersion.cover_url ? (
          <LazyImage
            src={activeVersion.cover_url}
            alt={`Обложка трека ${activeVersion.title || track.title}`}
            placeholder="/placeholder.svg"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            wrapperClassName="w-full h-full"
          />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradient)}>
            <Music className="w-8 h-8 text-primary/50" />
          </div>
        )}

        {track.status === 'completed' && (
          <div
            className={cn(
              "absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300",
              isHovered || (isCurrentTrack && isPlaying) ? "opacity-100" : "opacity-0 group-focus-within:opacity-100"
            )}
          >
            <Button
              variant="secondary"
              size="icon"
              onClick={handlePlayClick}
              disabled={playButtonDisabled}
              className="rounded-full w-10 h-10 shadow-lg hover:scale-110 transition-transform"
              aria-label={isCurrentTrack && isPlaying ? "Приостановить" : "Воспроизвести"}
            >
              {isCurrentTrack && isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </Button>
          </div>
        )}
      </div>

      <CardContent className="p-2 flex-1 flex flex-col">
          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-0.5">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <h3 className="font-semibold text-sm leading-tight line-clamp-1 group-hover:text-primary">
                  {activeVersion.title || track.title}
                </h3>
              {hasStems && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Split className="h-3.5 w-3.5 text-primary shrink-0" />
                    </TooltipTrigger>
                    <TooltipContent>Доступны стемы</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            
            {/* Phase 1.2: Version badges */}
            {versionCount > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-0.5">
                        <Layers className="h-2.5 w-2.5" />
                        <span>{versionCount + 1}</span>
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      {versionCount + 1} {versionCount === 0 ? 'версия' : versionCount < 4 ? 'версии' : 'версий'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {masterVersion && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge variant="outline" className="h-5 px-1.5 text-[10px] gap-0.5 border-primary/50">
                          <Star className="h-2.5 w-2.5 fill-primary text-primary" />
                          <span>
                            {getVersionShortLabel({
                              versionNumber: masterVersion.versionNumber,
                              isOriginal: masterVersion.isOriginal,
                              isMaster: true,
                            })}
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent>Мастер-версия для воспроизведения</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            )}
          </div>
          
          <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">{track.prompt}</p>
        </div>

        {(track.status === 'processing' || track.status === 'pending') && (
          <div className="mb-2">
            <TrackProgressBar
              progress={track.progress_percent || 0}
              status={track.status}
              createdAt={track.created_at}
            />
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground mt-auto">
          <div className="flex items-center gap-2">
            {formattedDuration && (
              <div className="flex items-center gap-1"><Clock className="w-3 h-3" /><span>{formattedDuration}</span></div>
            )}
          </div>
          <div className="flex items-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6" onClick={handleLikeClick} aria-label={isLiked ? "Убрать из избранного" : "В избранное"}>
                    <Heart className={cn("w-3 h-3", isLiked && "fill-red-500 text-red-500")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{isLiked ? "Убрать из избранного" : "В избранное"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            {track.status === 'completed' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Опции"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 z-[200]">
                  <DropdownMenuItem onClick={handleDownloadClick}>
                    <Download className="w-4 h-4 mr-2" />
                    Скачать MP3
                  </DropdownMenuItem>
                  <WavConvertMenuItem trackId={track.id} trackMetadata={track.metadata} />
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleShareClick}>
                    <Share2 className="w-4 h-4 mr-2" />
                    Поделиться
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleTogglePublic(); }}>
                    <Globe className="w-4 h-4 mr-2" />
                    {track.is_public ? 'Скрыть' : 'Опубликовать'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <DropdownMenuItem 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              onSeparateStems?.(track.id);
                            }}
                            disabled={!onSeparateStems}
                          >
                            <Split className="w-4 h-4 mr-2" />
                            Разделить на стемы
                          </DropdownMenuItem>
                        </div>
                      </TooltipTrigger>
                    </Tooltip>
                  </TooltipProvider>
                  <DropdownMenuItem 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onExtend?.(track.id);
                    }}
                    disabled={!onExtend || !track.audio_url}
                  >
                    <Expand className="w-4 h-4 mr-2" />
                    Расширить трек
                  </DropdownMenuItem>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <DropdownMenuItem 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              if (isSunoTrack) onCover?.(track.id);
                            }}
                            disabled={!onCover || isMurekaTrack}
                            className={isMurekaTrack ? 'opacity-50' : ''}
                          >
                            <Mic2 className="w-4 h-4 mr-2" />
                            Создать кавер
                          </DropdownMenuItem>
                        </div>
                      </TooltipTrigger>
                      {isMurekaTrack && (
                        <TooltipContent side="left">
                          Кавер доступен только для Suno треков
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                  {!track.has_vocals && (
                    <DropdownMenuItem 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        onAddVocal?.(track.id);
                      }}
                      disabled={!onAddVocal}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Добавить вокал
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
};

// Оптимизированная мемоизация: перерендер только при изменении критичных пропсов
const MemoizedTrackCard = memo(TrackCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.track.id === nextProps.track.id &&
    prevProps.track.status === nextProps.track.status &&
    prevProps.track.like_count === nextProps.track.like_count &&
    prevProps.track.is_public === nextProps.track.is_public &&
    prevProps.track.audio_url === nextProps.track.audio_url &&
    prevProps.track.progress_percent === nextProps.track.progress_percent &&
    prevProps.onClick === nextProps.onClick
  );
});

const TrackCardWithErrorBoundary = withErrorBoundary(MemoizedTrackCard);
TrackCardWithErrorBoundary.displayName = "TrackCard";

export { TrackCardWithErrorBoundary as TrackCard };

// Inject keyframes for fade-in animation once
if (typeof document !== "undefined" && !document.getElementById('track-card-animation-style')) {
  const style = document.createElement("style");
  style.id = 'track-card-animation-style';
  style.textContent = `
    @keyframes fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in {
      animation: fade-in 0.4s ease-out forwards;
    }
  `;
  document.head.appendChild(style);
}