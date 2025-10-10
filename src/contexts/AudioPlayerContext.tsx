import { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { usePlayAnalytics } from '@/hooks/usePlayAnalytics';
import { logError, logInfo } from '@/utils/logger';
import { cacheAudioFile } from '../utils/serviceWorker';
import { AudioPlayerTrack } from '@/types/track';
import { useToast } from '@/hooks/use-toast';
import { getTrackWithVersions, TrackWithVersions } from '@/features/tracks';

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.webm'] as const;

export const hasKnownAudioExtension = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname.toLowerCase();
    return AUDIO_EXTENSIONS.some(extension => pathname.endsWith(extension));
  } catch {
    const sanitized = url.split('?')[0]?.toLowerCase() ?? '';
    const lastSegment = sanitized.split('/').pop() ?? '';
    return AUDIO_EXTENSIONS.some(extension => lastSegment.endsWith(extension));
  }
};

// Константы высот плеера для разных устройств
export const PLAYER_HEIGHTS = {
  mobile: 72, // MiniPlayer высота
  desktop: 88, // GlobalAudioPlayer высота
  safeAreaOffset: 16, // Дополнительный отступ
} as const;

interface AudioPlayerContextType {
  currentTrack: AudioPlayerTrack | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  queue: AudioPlayerTrack[];
  currentQueueIndex: number;
  playTrack: (track: AudioPlayerTrack) => void;
  playTrackWithQueue: (track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => void;
  togglePlayPause: () => void;
  pauseTrack: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  playNext: () => void;
  playPrevious: () => void;
  addToQueue: (track: AudioPlayerTrack) => void;
  removeFromQueue: (trackId: string) => void;
  clearQueue: () => void;
  reorderQueue: (startIndex: number, endIndex: number) => void;
  switchToVersion: (versionId: string) => void;
  getAvailableVersions: () => AudioPlayerTrack[];
  currentVersionIndex: number;
  audioRef: React.RefObject<HTMLAudioElement>;
  clearCurrentTrack: () => void;
}

const AudioPlayerContext = createContext<AudioPlayerContextType | undefined>(undefined);

export const AudioPlayerProvider = ({ children }: { children: ReactNode }) => {
  const [currentTrack, setCurrentTrack] = useState<AudioPlayerTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [queue, setQueue] = useState<AudioPlayerTrack[]>([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(-1);
  
  // ============= TRACK VERSIONS SYSTEM =============
  // Управление версиями треков: загрузка, переключение, автоматическая очередь
  const [availableVersions, setAvailableVersions] = useState<TrackWithVersions[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [autoPlayVersions] = useState(true); // Включаем автовоспроизведение версий
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const { playTime, hasRecorded } = usePlayAnalytics(currentTrack?.id || null, isPlaying, currentTime);
  // Используем playTime и hasRecorded для аналитики
  useEffect(() => {
    if (hasRecorded && playTime > 0) {
      // Аналитика записана
    }
  }, [hasRecorded, playTime]);

  /**
   * Загрузка всех версий для трека и добавление их в очередь
   */
  const loadVersions = useCallback(async (trackId: string): Promise<TrackWithVersions[]> => {
    try {
      logInfo(`Loading versions for track: ${trackId}`, 'AudioPlayerContext');
      const versions = await getTrackWithVersions(trackId);
      
      if (versions.length > 0) {
        setAvailableVersions(versions);
        logInfo(`Loaded ${versions.length} versions for track ${trackId}`, 'AudioPlayerContext', {
          versionIds: versions.map(v => ({ id: v.id, num: v.versionNumber }))
        });
        
        // Если включено автовоспроизведение версий, добавить их в очередь
        if (autoPlayVersions && versions.length > 1) {
          // Фильтруем только версии с audio_url
          const versionsWithAudio = versions.filter(v => v.audio_url);
          const versionTracks = versionsWithAudio.map(v => ({
            id: v.id,
            title: v.title,
            audio_url: v.audio_url!,
            cover_url: v.cover_url,
            duration: v.duration,
            style_tags: v.style_tags,
            lyrics: v.lyrics,
            status: 'completed' as const,
            parentTrackId: v.parentTrackId,
            versionNumber: v.versionNumber,
            isMasterVersion: v.isMasterVersion,
            isOriginalVersion: v.isOriginal,
            sourceVersionNumber: v.sourceVersionNumber,
          }));
          
          setQueue(prev => {
            const currentIdx = Math.max(0, currentQueueIndex);
            const next = [...prev];
            const firstVersionId = versionTracks[1]?.id;
            if (firstVersionId && next.some(t => t.id === firstVersionId)) {
                return prev; // Already queued
            }
            next.splice(currentIdx + 1, 0, ...versionTracks.slice(1));
            logInfo(`Auto-queued ${versionTracks.length - 1} versions after index ${currentIdx}`, 'AudioPlayerContext');
            return next;
          });
        }
      } else {
        setAvailableVersions([]);
        logInfo(`No versions found for track ${trackId}`, 'AudioPlayerContext');
      }
      
      return versions;
    } catch (error) {
      logError('Failed to load track versions', error as Error, 'AudioPlayerContext', { trackId });
      setAvailableVersions([]);
      return [];
    }
  }, [autoPlayVersions, currentQueueIndex]);

  const isKnownAudioExtension = useCallback((url: string) => hasKnownAudioExtension(url), []);

  // Мемоизированная функция воспроизведения трека
  const playTrack = useCallback(async (track: AudioPlayerTrack) => {
    // Нормализация URL - добавить .mp3 если отсутствует
    let audioUrl = track.audio_url;
    if (audioUrl && !isKnownAudioExtension(audioUrl) && !audioUrl.includes('?')) {
      audioUrl = audioUrl + '.mp3';
      logInfo('Normalized audio URL', 'AudioPlayerContext', {
        original: track.audio_url,
        normalized: audioUrl
      });
    }
    
    // Validate track can be played - смягчаем проверку статуса
    if (!audioUrl) {
      logError('Cannot play track - missing audio_url', new Error('No audio URL'), 'AudioPlayerContext', { trackId: track.id, status: track.status });
      toast({
        title: "Невозможно воспроизвести",
        description: "Аудио недоступно",
        variant: "destructive",
      });
      return;
    }
    
    // Разрешаем воспроизведение для треков с audio_url, даже если status !== 'completed'
    // Это важно для версий треков, которые могут иметь другой статус
    if (track.status === 'processing' || track.status === 'pending') {
      logInfo('Attempting to play track with non-completed status', 'AudioPlayerContext', { 
        trackId: track.id, 
        status: track.status 
      });
      toast({
        title: "Внимание",
        description: "Трек всё ещё генерируется, но мы попробуем воспроизвести",
        duration: 3000,
      });
    }
    
    // Используем нормализованный URL
    const normalizedTrack = {
      ...track,
      audio_url: audioUrl,
      isOriginalVersion: track.isOriginalVersion ?? (track.versionNumber ? track.versionNumber <= 1 : undefined),
      sourceVersionNumber: track.sourceVersionNumber ?? null,
    };
    
    // Детальное логирование трека
    logInfo('Preparing to play track', 'AudioPlayerContext', {
      trackId: normalizedTrack.id,
      title: normalizedTrack.title,
      parentTrackId: normalizedTrack.parentTrackId,
      versionNumber: normalizedTrack.versionNumber,
      urlPreview: audioUrl.substring(0, 60) + '...',
      status: normalizedTrack.status
    });

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setCurrentTrack(normalizedTrack);
      setIsPlaying(false);

      // ============= ЗАГРУЗКА ВЕРСИЙ ТРЕКА =============
      // Загружаем версии используя parentTrackId или id основного трека
      const baseTrackId = normalizedTrack.parentTrackId || normalizedTrack.id;
      logInfo('Loading versions', 'AudioPlayerContext', { 
        trackId: normalizedTrack.id, 
        baseTrackId,
        hasParent: !!normalizedTrack.parentTrackId
      });
      
      const versions = await loadVersions(baseTrackId);
      
      // Определяем индекс текущей версии
      if (versions.length > 0) {
        const currentIdx = versions.findIndex(v => v.id === normalizedTrack.id);
        setCurrentVersionIndex(currentIdx >= 0 ? currentIdx : 0);
        logInfo('Set current version index', 'AudioPlayerContext', { 
          currentVersionIndex: currentIdx >= 0 ? currentIdx : 0,
          totalVersions: versions.length 
        });
      }

      if (audioRef.current && audioUrl) {
        // Условное применение crossOrigin только для внутренних файлов
        const isInternalUrl = audioUrl.includes('supabase') || audioUrl.includes('lovable');
        if (isInternalUrl) {
          audioRef.current.crossOrigin = 'anonymous';
          logInfo('Applied crossOrigin for internal URL', 'AudioPlayerContext');
        } else {
          // Для внешних URL не устанавливаем crossOrigin
          audioRef.current.removeAttribute('crossOrigin');
          logInfo('Skipped crossOrigin for external URL', 'AudioPlayerContext');
        }
        
        audioRef.current.src = audioUrl;
        audioRef.current.load(); // Явно загружаем для детерминизма
        
        try {
          await cacheAudioFile(audioUrl);
        } catch (error) {
          logError('Failed to cache audio file', error as Error, 'AudioPlayerContext', { trackId: normalizedTrack.id });
        }

        try {
          await audioRef.current.play();
          setIsPlaying(true);
          
          logInfo(`Now playing: ${normalizedTrack.title}`, 'AudioPlayerContext', {
            trackId: normalizedTrack.id,
            versionNumber: normalizedTrack.versionNumber,
            sourceVersionNumber: normalizedTrack.sourceVersionNumber,
            isOriginal: normalizedTrack.isOriginalVersion,
          });

          // Показываем тост при переключении версии
          if (!normalizedTrack.isOriginalVersion && normalizedTrack.versionNumber) {
            toast({
              title: `Версия ${normalizedTrack.versionNumber}`,
              description: `Переключено на ${normalizedTrack.title}`,
              duration: 2000,
            });
          }
          
          // Аналитика воспроизведения обрабатывается автоматически хуком usePlayAnalytics
        } catch (error) {
          logError('Failed to play track', error as Error, 'AudioPlayerContext', { trackId: normalizedTrack.id });
          toast({
            title: "Ошибка воспроизведения",
            description: "Не удалось загрузить аудиофайл. Попробуйте ещё раз.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      logError('Error in playTrack', error as Error, 'AudioPlayerContext', { trackId: normalizedTrack.id });
    }
  }, [toast, loadVersions, isKnownAudioExtension]);

  // Мемоизированная функция воспроизведения трека с очередью
  const playTrackWithQueue = useCallback((track: AudioPlayerTrack, allTracks: AudioPlayerTrack[]) => {
    setQueue(allTracks);
    const trackIndex = allTracks.findIndex(t => t.id === track.id);
    setCurrentQueueIndex(trackIndex);
    playTrack(track);
  }, [playTrack]);

  // Мемоизированная функция переключения воспроизведения/паузы
  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          logError('Failed to play/pause track', error as Error);
        });
      }
    }
  }, [isPlaying]);

  // Мемоизированная функция паузы
  const pauseTrack = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, []);

  // Мемоизированная функция перемотки
  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  // Мемоизированная функция установки громкости
  const setVolume = useCallback((newVolume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = newVolume;
      setVolumeState(newVolume);
    }
  }, []);

  // Мемоизированная функция следующего трека
  const playNext = useCallback(() => {
    if (queue.length > 0 && currentQueueIndex < queue.length - 1) {
      const nextIndex = currentQueueIndex + 1;
      setCurrentQueueIndex(nextIndex);
      playTrack(queue[nextIndex]);
    }
  }, [queue, currentQueueIndex, playTrack]);

  // Мемоизированная функция предыдущего трека
  const playPrevious = useCallback(() => {
    if (queue.length > 0 && currentQueueIndex > 0) {
      const prevIndex = currentQueueIndex - 1;
      setCurrentQueueIndex(prevIndex);
      playTrack(queue[prevIndex]);
    }
  }, [queue, currentQueueIndex, playTrack]);

  // Мемоизированная функция добавления в очередь
  const addToQueue = useCallback((track: AudioPlayerTrack) => {
    setQueue(prev => [...prev, track]);
  }, []);

  // Мемоизированная функция удаления из очереди
  const removeFromQueue = useCallback((trackId: string) => {
    setQueue(prev => prev.filter(track => track.id !== trackId));
  }, []);

  // Мемоизированная функция очистки очереди
  const clearQueue = useCallback(() => {
    setQueue([]);
    setCurrentQueueIndex(-1);
  }, []);

  // Мемоизированная функция изменения порядка в очереди
  const reorderQueue = useCallback((startIndex: number, endIndex: number) => {
    setQueue(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      return result;
    });
  }, []);

  const clearCurrentTrack = useCallback(() => {
    setCurrentTrack(null);
    setQueue([]);
    setCurrentQueueIndex(-1);
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.removeAttribute('src');
      audioRef.current.load();
    }
  }, []);

  /**
   * Получение списка доступных версий текущего трека
   * @returns Массив версий текущего трека
   */
  const getAvailableVersions = useCallback((): AudioPlayerTrack[] => {
    if (availableVersions.length === 0) return [];
    
    // Преобразуем TrackWithVersions в AudioPlayerTrack, фильтруя только те, у которых есть audio_url
    return availableVersions
      .filter(v => v.audio_url)
      .map(v => ({
        id: v.id,
        title: v.title,
        audio_url: v.audio_url!,
        cover_url: v.cover_url,
        duration: v.duration,
        style_tags: v.style_tags,
        lyrics: v.lyrics,
        status: 'completed' as const,
        parentTrackId: v.parentTrackId,
        versionNumber: v.versionNumber,
        isMasterVersion: v.isMasterVersion,
      }));
  }, [availableVersions]);

  /**
   * Переключение на конкретную версию трека
   * @param versionId - ID версии для переключения
   */
  const switchToVersion = useCallback((versionId: string) => {
    const version = availableVersions.find(v => v.id === versionId);
    
    if (!version) {
      logError('Version not found', new Error(`Version ${versionId} not found`), 'AudioPlayerContext', { versionId, availableCount: availableVersions.length });
      return;
    }
    
    if (!version.audio_url) {
      logError('Version has no audio URL', new Error(`Version ${versionId} has no audio_url`), 'AudioPlayerContext', { versionId });
      return;
    }
    
    const versionIndex = availableVersions.findIndex(v => v.id === versionId);
    setCurrentVersionIndex(versionIndex);
    
    logInfo(`Switching to version ${versionIndex + 1}/${availableVersions.length}`, 'AudioPlayerContext', { 
      versionId, 
      versionNumber: version.versionNumber,
      isMaster: version.isMasterVersion 
    });
    
    // Создаем AudioPlayerTrack из версии
    const trackToPlay: AudioPlayerTrack = {
      id: version.id,
      title: version.title,
      audio_url: version.audio_url,
      cover_url: version.cover_url,
      duration: version.duration,
      style_tags: version.style_tags,
      lyrics: version.lyrics,
      status: 'completed',
      parentTrackId: version.parentTrackId,
      versionNumber: version.versionNumber,
      isMasterVersion: version.isMasterVersion,
    };
    
    playTrack(trackToPlay);
  }, [availableVersions, playTrack]);

  // Обработчики событий аудио элемента
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration);
    const handleEnded = () => {
      setIsPlaying(false);
      playNext();
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    
    // Добавлен обработчик ошибок для детальной диагностики
    const handleError = () => {
      const mediaError = audio.error;
      if (!mediaError) return;

      let errorMessage = 'Неизвестная ошибка загрузки аудио';
      let shouldRetry = false;

      switch (mediaError.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          errorMessage = 'Загрузка прервана пользователем';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          errorMessage = 'Ошибка сети при загрузке';
          shouldRetry = true;
          break;
        case MediaError.MEDIA_ERR_DECODE:
          errorMessage = 'Ошибка декодирования аудио';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          errorMessage = 'Формат аудио не поддерживается';
          break;
      }

      logError('Audio playback error', new Error(errorMessage), 'AudioPlayerContext', {
        code: mediaError.code,
        message: mediaError.message,
        src: audio.src,
        trackId: currentTrack?.id,
      });

      // Автоматический retry для сетевых ошибок (1 раз)
      if (shouldRetry && audio.src) {
        logInfo('Retrying audio load after network error...', 'AudioPlayerContext');
        setTimeout(() => {
          audio.load();
          audio.play().catch(err => {
            logError('Retry failed', err as Error, 'AudioPlayerContext');
            toast({
              title: "Ошибка воспроизведения",
              description: errorMessage,
              variant: "destructive",
              duration: 5000,
            });
          });
        }, 1000);
      } else {
        toast({
          title: "Ошибка воспроизведения",
          description: errorMessage,
          variant: "destructive",
          duration: 5000,
        });
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('error', handleError);
    };
  }, [playNext, currentTrack, toast]);

  // Мемоизированное значение контекста
  const contextValue = useMemo(() => ({
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    currentQueueIndex,
    playTrack,
    playTrackWithQueue,
    togglePlayPause,
    pauseTrack,
    seekTo,
    setVolume,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    switchToVersion,
    getAvailableVersions,
    currentVersionIndex,
    audioRef,
    clearCurrentTrack,
  }), [
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    queue,
    currentQueueIndex,
    playTrack,
    playTrackWithQueue,
    togglePlayPause,
    pauseTrack,
    seekTo,
    setVolume,
    playNext,
    playPrevious,
    addToQueue,
    removeFromQueue,
    clearQueue,
    reorderQueue,
    switchToVersion,
    getAvailableVersions,
    currentVersionIndex,
    clearCurrentTrack,
  ]);

  return (
    <AudioPlayerContext.Provider value={contextValue}>
      <audio ref={audioRef} />
      {children}
    </AudioPlayerContext.Provider>
  );
};

export const useAudioPlayer = () => {
  const context = useContext(AudioPlayerContext);
  if (context === undefined) {
    if (process.env.NODE_ENV === 'development') {
      console.error(
        'useAudioPlayer must be used within AudioPlayerProvider. ' +
        'Make sure your component is wrapped with <AudioPlayerProvider>.'
      );
    }
    throw new Error('useAudioPlayer must be used within AudioPlayerProvider');
  }
  return context;
};

// Safe version that returns null if context is not available
export const useAudioPlayerSafe = () => {
  return useContext(AudioPlayerContext);
};
