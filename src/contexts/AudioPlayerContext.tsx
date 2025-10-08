import { createContext, useContext, useState, useRef, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { usePlayAnalytics } from '@/hooks/usePlayAnalytics';
import { logError, logInfo } from '@/utils/logger';
import { cacheAudioFile } from '../utils/serviceWorker';
import { AudioPlayerTrack } from '@/types/track';
import { useToast } from '@/hooks/use-toast';
import { getTrackWithVersions, TrackWithVersions } from '@/utils/trackVersions';

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
  const [autoPlayVersions, setAutoPlayVersions] = useState(false); // Настройка автовоспроизведения версий
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();
  const { playTime, hasRecorded } = usePlayAnalytics(currentTrack?.id || null, isPlaying, currentTime);

  /**
   * Загрузка всех версий для трека
   * @param trackId - ID трека (может быть основной трек или версия)
   */
  const loadVersions = useCallback(async (trackId: string) => {
    try {
      logInfo(`Loading versions for track: ${trackId}`, 'AudioPlayerContext');
      const versions = await getTrackWithVersions(trackId);
      
      if (versions.length > 0) {
        setAvailableVersions(versions);
        logInfo(`Loaded ${versions.length} versions for track ${trackId}`, 'AudioPlayerContext');
        
        // Если включено автовоспроизведение версий, добавить их в очередь
        if (autoPlayVersions && versions.length > 1) {
          const versionTracks = versions.map(v => ({
            id: v.id,
            title: v.title,
            audio_url: v.audio_url,
            cover_url: v.cover_url,
            duration: v.duration,
            style_tags: v.style_tags,
            lyrics: v.lyrics,
            status: 'completed' as const,
            parentTrackId: v.parentTrackId,
            versionNumber: v.versionNumber,
            isMasterVersion: v.isMasterVersion,
          }));
          
          logInfo(`Auto-queueing ${versionTracks.length} versions`, 'AudioPlayerContext');
          setQueue(prev => [...prev, ...versionTracks.slice(1)]); // Добавить версии после текущего трека
        }
      } else {
        setAvailableVersions([]);
        logInfo(`No versions found for track ${trackId}`, 'AudioPlayerContext');
      }
    } catch (error) {
      logError('Failed to load track versions', error as Error, 'AudioPlayerContext', { trackId });
      setAvailableVersions([]);
    }
  }, [autoPlayVersions]);

  // Мемоизированная функция воспроизведения трека
  const playTrack = useCallback(async (track: AudioPlayerTrack) => {
    // Нормализация URL - добавить .mp3 если отсутствует
    let audioUrl = track.audio_url;
    if (audioUrl && !audioUrl.endsWith('.mp3') && !audioUrl.includes('?')) {
      audioUrl = audioUrl + '.mp3';
      logInfo('Normalized audio URL', 'AudioPlayerContext', { 
        original: track.audio_url, 
        normalized: audioUrl 
      });
    }
    
    // Validate track can be played
    if (!audioUrl || track.status !== 'completed') {
      logError('Cannot play track - missing audio_url or not completed', new Error(`Track status: ${track.status}`), 'AudioPlayerContext', { trackId: track.id, status: track.status });
      toast({
        title: "Невозможно воспроизвести",
        description: track.status === 'processing' ? "Трек всё ещё генерируется" : "Аудио недоступно",
        variant: "destructive",
      });
      return;
    }
    
    // Используем нормализованный URL
    const normalizedTrack = { ...track, audio_url: audioUrl };

    // ============= ПРОВЕРКА ДОСТУПНОСТИ URL =============
    // Проверяем, доступен ли аудиофайл перед воспроизведением
    try {
      logInfo('Checking audio URL availability...', 'AudioPlayerContext', { url: audioUrl.substring(0, 50) + '...' });
      
      const response = await fetch(audioUrl, { 
        method: 'HEAD',
        mode: 'no-cors' // Избегаем CORS ошибок при проверке
      });
      
      // Note: с mode: 'no-cors' response.ok всегда будет false, но мы можем проверить type
      // Если fetch не выбросил ошибку, URL скорее всего доступен
      logInfo('Audio URL check completed', 'AudioPlayerContext');
      
    } catch (error) {
      logError('Audio URL is not accessible', error as Error, 'AudioPlayerContext', { trackId: normalizedTrack.id });
      toast({
        title: "Аудио недоступно",
        description: "Файл устарел или удалён. Попробуйте регенерировать трек.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }
    
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }

      setCurrentTrack(normalizedTrack);
      setIsPlaying(false);

      // ============= ЗАГРУЗКА ВЕРСИЙ ТРЕКА =============
      // При воспроизведении трека автоматически загружаем все его версии
      await loadVersions(normalizedTrack.id);

      if (audioRef.current && audioUrl) {
        audioRef.current.src = audioUrl;
        audioRef.current.crossOrigin = 'anonymous'; // Enable CORS for audio
        
        try {
          await cacheAudioFile(audioUrl);
        } catch (error) {
          logError('Failed to cache audio file', error as Error, 'AudioPlayerContext', { trackId: normalizedTrack.id });
        }

        try {
          await audioRef.current.play();
          setIsPlaying(true);
          
          logInfo(`Now playing: ${normalizedTrack.title}`, 'AudioPlayerContext', { trackId: normalizedTrack.id });
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
  }, [toast, loadVersions]);

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
      audioRef.current.src = '';
    }
  }, []);

  /**
   * Получение списка доступных версий текущего трека
   * @returns Массив версий текущего трека
   */
  const getAvailableVersions = useCallback((): AudioPlayerTrack[] => {
    if (availableVersions.length === 0) return [];
    
    // Преобразуем TrackWithVersions в AudioPlayerTrack
    return availableVersions.map(v => ({
      id: v.id,
      title: v.title,
      audio_url: v.audio_url,
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

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [playNext]);

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
