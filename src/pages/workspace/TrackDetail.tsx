import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { FullPageSpinner } from '@/components/ui/loading-states';
import { 
  ArrowLeft, 
  Play, 
  Pause, 
  Download, 
  Heart, 
  Share2,
  Music,
  Mic,
  Clock,
  Calendar,
  Split,
  Eye,
  ThumbsUp
} from 'lucide-react';
import { formatDuration } from '@/utils/formatters';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useAudioPlayerStore } from '@/stores/audioPlayerStore';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Track } from '@/types/domain/track.types';

const TrackDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLiked, setIsLiked] = useState(false);
  
  const currentTrack = useAudioPlayerStore((state) => state.currentTrack);
  const isPlaying = useAudioPlayerStore((state) => state.isPlaying);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);
  const pauseTrack = useAudioPlayerStore((state) => state.pause);
  
  const isCurrentTrack = currentTrack?.id === id;

  // Fetch track data
  const { data: track, isLoading, error } = useQuery({
    queryKey: ['track', id],
    queryFn: async () => {
      if (!id) throw new Error('Track ID is required');
      const { data, error } = await supabase
        .from('tracks')
        .select(`
          *,
          track_versions (
            id,
            variant_index,
            audio_url,
            cover_url,
            duration,
            lyrics,
            is_preferred_variant,
            is_primary_variant
          ),
          track_stems (
            id,
            stem_type,
            audio_url
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Track;
    },
    enabled: !!id,
  });

  // Check if liked
  useEffect(() => {
    if (!id) return;
    
    const checkLiked = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('track_likes')
        .select('id')
        .eq('track_id', id)
        .eq('user_id', user.id)
        .maybeSingle();

      setIsLiked(!!data);
    };

    checkLiked();
  }, [id]);

  const handlePlayPause = () => {
    if (!track?.audio_url) return;

    if (isCurrentTrack && isPlaying) {
      pauseTrack();
    } else {
      playTrack(track as any);
    }
  };

  const handleLike = async () => {
    if (!id) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: 'Требуется авторизация',
        description: 'Войдите, чтобы добавить трек в избранное',
        variant: 'destructive',
      });
      return;
    }

    if (isLiked) {
      await supabase
        .from('track_likes')
        .delete()
        .eq('track_id', id)
        .eq('user_id', user.id);
      
      setIsLiked(false);
      toast({ title: 'Удалено из избранного' });
    } else {
      await supabase
        .from('track_likes')
        .insert({ track_id: id, user_id: user.id });
      
      setIsLiked(true);
      toast({ title: 'Добавлено в избранное' });
    }
  };

  const handleDownload = () => {
    if (!track?.audio_url) return;

    const link = document.createElement('a');
    link.href = track.audio_url;
    link.download = `${track.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({ title: 'Загрузка началась' });
  };

  const handleShare = () => {
    const url = window.location.href;
    
    if (navigator.share) {
      navigator.share({
        title: track?.title,
        text: `Послушайте "${track?.title}" в Albert3 Muse Synth Studio`,
        url,
      }).catch(() => {
        // Fallback to copy
        navigator.clipboard.writeText(url);
        toast({ title: 'Ссылка скопирована' });
      });
    } else {
      navigator.clipboard.writeText(url);
      toast({ title: 'Ссылка скопирована' });
    }
  };

  if (isLoading) {
    return <FullPageSpinner />;
  }

  if (error || !track) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <h1 className="text-2xl font-bold">Трек не найден</h1>
        <Button onClick={() => navigate('/workspace/library')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Вернуться к библиотеке
        </Button>
      </div>
    );
  }

  const formattedDate = format(new Date(track.created_at), 'd MMMM yyyy, HH:mm', { locale: ru });
  const hasStems = (track as any).track_stems?.length > 0;

  return (
    <div className="container-padding py-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад
        </Button>
      </motion.div>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="p-6">
            {/* Cover & Info */}
            <div className="flex flex-col md:flex-row gap-6 mb-6">
              {/* Cover */}
              <div className="flex-shrink-0">
                <div className="relative aspect-square w-full md:w-64 rounded-lg overflow-hidden bg-gradient-to-br from-primary/20 to-accent/20">
                  {track.cover_url ? (
                    <img
                      src={track.cover_url}
                      alt={track.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="w-16 h-16 text-primary/50" />
                    </div>
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold mb-2">{track.title}</h1>
                
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {track.has_vocals ? (
                    <Badge variant="secondary">
                      <Mic className="w-3 h-3 mr-1" />
                      С вокалом
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      <Music className="w-3 h-3 mr-1" />
                      Инструментал
                    </Badge>
                  )}
                  
                  {hasStems && (
                    <Badge variant="secondary">
                      <Split className="w-3 h-3 mr-1" />
                      Стемы
                    </Badge>
                  )}
                  
                  {track.metadata?.provider && (
                    <Badge variant="outline">
                      {track.metadata.provider === 'suno' ? 'Suno AI' : 'Mureka AI'}
                    </Badge>
                  )}
                </div>

                <p className="text-muted-foreground mb-6">{track.prompt}</p>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{track.duration ? formatDuration(track.duration) : 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <ThumbsUp className="w-4 h-4 text-muted-foreground" />
                    <span>{track.like_count || 0} лайков</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Eye className="w-4 h-4 text-muted-foreground" />
                    <span>{track.play_count || 0} прослушиваний</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span>{formattedDate}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="lg"
                    onClick={handlePlayPause}
                    disabled={!track.audio_url}
                    className="min-w-[120px]"
                  >
                    {isCurrentTrack && isPlaying ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        Пауза
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Играть
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleLike}
                  >
                    <Heart className={cn('w-4 h-4 mr-2', isLiked && 'fill-red-500 text-red-500')} />
                    {isLiked ? 'В избранном' : 'Лайк'}
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleDownload}
                    disabled={!track.audio_url}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Скачать
                  </Button>

                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4 mr-2" />
                    Поделиться
                  </Button>
                </div>
              </div>
            </div>

            <Separator className="my-6" />

            {/* Lyrics */}
            {track.lyrics && (
              <div className="mb-6">
                <h2 className="text-xl font-semibold mb-4">Текст песни</h2>
                <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans bg-muted/30 p-4 rounded-lg">
                  {track.lyrics}
                </pre>
              </div>
            )}

            {/* Style Tags */}
            {track.style_tags && track.style_tags.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Стиль</h2>
                <div className="flex flex-wrap gap-2">
                  {track.style_tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default TrackDetail;
