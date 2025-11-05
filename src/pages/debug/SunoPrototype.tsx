import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { TimestampedLyricsDisplay } from '@/components/player/TimestampedLyricsDisplay';
import { useTimestampedLyrics } from '@/hooks/useTimestampedLyrics';
import { ReplaceSectionDialog } from '@/components/tracks/ReplaceSectionDialog';
import { useReplaceSection } from '@/hooks/useReplaceSection';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface PrototypeTrack {
  id: string;
  title: string;
  duration_seconds: number;
  suno_task_id: string | null;
  style_tags: string[] | null;
  audio_url?: string | null;
  cover_url?: string | null;
  status?: string | null;
}

// Define the expected data structure from Supabase for a single track
type SupabaseTrackData = {
  id: string;
  title: string;
  duration_seconds: number | null;
  suno_task_id: string | null;
  style_tags: string[] | null;
  audio_url: string | null;
  cover_url: string | null;
  status: string | null;
};

export default function SunoPrototypePage() {
  // ===== State and Refs =====
  const [taskId, setTaskId] = useState<string>('');
  const [audioId, setAudioId] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [karaokeEnabled, setKaraokeEnabled] = useState<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);

  const [trackId, setTrackId] = useState<string>('');
  const [loadedTrack, setLoadedTrack] = useState<PrototypeTrack | null>(null);
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);

  // ===== Hooks =====
  const { data: lyricsData, isFetching: lyricsLoading } = useTimestampedLyrics({
    taskId: karaokeEnabled ? taskId : undefined,
    audioId: karaokeEnabled ? audioId : undefined,
    enabled: karaokeEnabled,
  });

  const { replacements, loadReplacements } = useReplaceSection();

  // ===== Memoized Values =====
  const timestampedWords = useMemo(() => lyricsData?.alignedWords ?? [], [lyricsData]);

  // ===== Callbacks =====
  const handleSeek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []); // No dependencies needed as audioRef.current is stable

  const handleReplaceSuccess = useCallback(() => {
    if (loadedTrack) {
      loadReplacements(loadedTrack.id);
    }
  }, [loadedTrack, loadReplacements]);

  const loadTrack = useCallback(async () => {
    if (!trackId.trim()) {
      setLoadedTrack(null); // Clear loaded track if input is empty
      return;
    }

    const { data, error } = await supabase
      .from('tracks')
      .select('id, title, duration_seconds, suno_task_id, style_tags, audio_url, cover_url, status')
      .eq('id', trackId)
      .limit(1)
      .maybeSingle<SupabaseTrackData>();

    if (error) {
      logger.error('Ошибка загрузки трека', error);
      setLoadedTrack(null); // Clear loaded track on error
      return;
    }
    if (!data) {
      logger.info('Трек не найден', trackId);
      setLoadedTrack(null);
      return;
    }

    const track: PrototypeTrack = {
      id: data.id,
      title: data.title,
      duration_seconds: data.duration_seconds ?? 0,
      suno_task_id: data.suno_task_id ?? null,
      style_tags: data.style_tags ?? null,
      audio_url: data.audio_url ?? null,
      cover_url: data.cover_url ?? null,
      status: data.status ?? null,
    };
    setLoadedTrack(track);
    await loadReplacements(track.id);
  }, [trackId, loadReplacements]); // Dependencies for loadTrack

  // ===== Effects =====
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTimeUpdate = () => setCurrentTime(el.currentTime);
    el.addEventListener('timeupdate', onTimeUpdate);
    return () => el.removeEventListener('timeupdate', onTimeUpdate);
  }, [audioRef, setCurrentTime]); // Add setCurrentTime to dependencies

  // ===== Render =====
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Прототип Suno: караоке, замена секции, хедер</h1>
        <p className="text-sm text-muted-foreground">
          Цель страницы — быстрая проверка функциональных блоков: синхронизированная лирика,
          замена сегмента трека и прототип хедера экрана генерации.
        </p>
      </div>

      <Tabs defaultValue="karaoke" className="space-y-6">
        <TabsList>
          <TabsTrigger value="karaoke">Караоке по таймстампам</TabsTrigger>
          <TabsTrigger value="replace">Замена секции трека</TabsTrigger>
          <TabsTrigger value="header">Хедер экрана генерации</TabsTrigger>
        </TabsList>

        {/* === Вкладка: Караоке === */}
        <TabsContent value="karaoke" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Синхронизированная лирика (Timestamped Lyrics)</CardTitle>
              <CardDescription>
                Введите идентификаторы `taskId` и `audioId`, добавьте прямую ссылку на аудио и, при желании, обложку.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taskId">Task ID</Label>
                  <Input id="taskId" value={taskId} onChange={(e) => setTaskId(e.target.value)} placeholder="например: suno-task-123" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audioId">Audio ID</Label>
                  <Input id="audioId" value={audioId} onChange={(e) => setAudioId(e.target.value)} placeholder="например: audio-abc" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audioUrl">Audio URL</Label>
                  <Input id="audioUrl" value={audioUrl} onChange={(e) => setAudioUrl(e.target.value)} placeholder="https://.../audio.mp3" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="coverUrl">Cover URL (необязательно)</Label>
                  <Input id="coverUrl" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} placeholder="https://.../cover.jpg" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setKaraokeEnabled(true)}
                  disabled={!taskId || !audioId || !audioUrl}
                >
                  Загрузить лирику
                </Button>
                <Button variant="outline" onClick={() => setKaraokeEnabled(false)}>Сбросить</Button>
              </div>

              <Separator />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Аудио</Label>
                  <audio ref={audioRef} src={audioUrl} controls preload="metadata" className="w-full" />
                  <p className="text-xs text-muted-foreground">Текущее время: {currentTime.toFixed(2)}s</p>
                </div>
                <div className="min-h-[320px]">
                  <Label>Караоке-отображение</Label>
                  <div className={cn('border rounded-md overflow-hidden min-h-[300px]')}>
                    <TimestampedLyricsDisplay
                      timestampedLyrics={timestampedWords}
                      currentTime={currentTime}
                      onSeek={handleSeek}
                      coverUrl={coverUrl || undefined}
                    />
                  </div>
                  {lyricsLoading && (
                    <p className="mt-2 text-xs text-muted-foreground">Загрузка меток лирики...</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Вкладка: Замена секции === */}
        <TabsContent value="replace" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Замена секции трека</CardTitle>
              <CardDescription>
                Загрузите трек по ID, затем откройте диалог замены и оформите замену сегмента (5–30 секунд).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="trackId">Track ID</Label>
                  <Input id="trackId" value={trackId} onChange={(e) => setTrackId(e.target.value)} placeholder="UUID трека из таблицы tracks" />
                </div>
                <div className="flex items-end">
                  <Button onClick={loadTrack} disabled={!trackId}>Загрузить трек</Button>
                </div>
              </div>

              {loadedTrack && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm font-medium">Название</p>
                      <p className="text-sm text-muted-foreground">{loadedTrack.title}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Длительность</p>
                      <p className="text-sm text-muted-foreground">{loadedTrack.duration_seconds}s</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Статус</p>
                      <p className="text-sm text-muted-foreground">{loadedTrack.status ?? 'unknown'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setDialogOpen(true)} disabled={!loadedTrack.suno_task_id}>Открыть диалог замены</Button>
                    {!loadedTrack.suno_task_id && (
                      <p className="text-xs text-muted-foreground">Для замены требуется `suno_task_id` у трека</p>
                    )}
                  </div>

                  <ReplaceSectionDialog
                    open={dialogOpen}
                    onOpenChange={setDialogOpen}
                    track={loadedTrack}
                    onSuccess={handleReplaceSuccess}
                  />

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <p className="text-sm font-medium">История замен секций</p>
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="text-left p-2">Диапазон</th>
                            <th className="text-left p-2">Статус</th>
                            <th className="text-left p-2">Аудио</th>
                            <th className="text-left p-2">Создано</th>
                          </tr>
                        </thead>
                        <tbody>
                          {replacements.map((rep) => (
                            <tr key={rep.id} className="border-t">
                              <td className="p-2">{rep.replaced_start_s.toFixed(2)}s – {rep.replaced_end_s.toFixed(2)}s</td>
                              <td className="p-2">{rep.status}</td>
                              <td className="p-2">
                                {rep.replacement_audio_url ? (
                                  <a className="text-primary hover:underline" href={rep.replacement_audio_url} target="_blank" rel="noreferrer">
                                    Открыть
                                  </a>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                              <td className="p-2">{new Date(rep.created_at).toLocaleString('ru')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Вкладка: Хедер генерации === */}
        <TabsContent value="header" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Прототип хедера экрана генерации</CardTitle>
              <CardDescription>
                Упрощённая демонстрация: фильтры, состояние очереди, быстрые действия.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="secondary">Фильтр: Популярные</Button>
                <Button size="sm" variant="secondary">Фильтр: Новые</Button>
                <Button size="sm" variant="secondary">Фильтр: Вокал</Button>
                <Button size="sm" variant="secondary">Фильтр: Инструментальные</Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-md border">
                  <p className="text-xs text-muted-foreground">В очереди</p>
                  <p className="text-lg font-semibold">—</p>
                </div>
                <div className="p-3 rounded-md border">
                  <p className="text-xs text-muted-foreground">Готово сегодня</p>
                  <p className="text-lg font-semibold">—</p>
                </div>
                <div className="p-3 rounded-md border">
                  <p className="text-lg font-semibold">—</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button>Создать трек</Button>
                <Button variant="outline">Импорт референса</Button>
                <Button variant="outline">Настройки модели</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
