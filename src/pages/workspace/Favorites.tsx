import { useState, useEffect } from "react";
import { Heart, Loader2 } from "@/utils/iconImports";
import { LikesService } from "@/services/likes.service";
import { supabase } from "@/integrations/supabase/client";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { TrackCard, getTrackWithVariants, trackVersionsQueryKeys } from "@/features/tracks";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trackConverters } from "@/types/domain/track.types";
import type { TrackStatus } from "@/services/api.service";
import { logger } from "@/utils/logger";

const isTrackStatus = (status: string): status is TrackStatus =>
  status === 'pending' || status === 'processing' || status === 'completed' || status === 'failed';

interface LikedTrack {
  id: string;
  title: string;
  audio_url: string | null;
  cover_url: string | null;
  duration: number | null;
  style_tags: string[] | null;
  status: string;
  user_id: string;
  created_at: string;
  like_count: number | null;
  view_count: number | null;
}

const Favorites = () => {
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const playTrackWithQueue = useAudioPlayerStore((state) => state.playTrackWithQueue);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadLikedTracks();
  }, []);

  const loadLikedTracks = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tracks = await LikesService.getLikedTracks(user.id);
      setLikedTracks(tracks as LikedTrack[]);
    } catch (error) {
      logger.error('Error loading liked tracks', error instanceof Error ? error : new Error(String(error)), 'Favorites');
      toast.error('Не удалось загрузить избранные треки');
    } finally {
      setIsLoading(false);
    }
  };


  const handleShare = (trackId: string) => {
    const shareUrl = `${window.location.origin}/track/${trackId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Ссылка скопирована в буфер обмена');
  };

  const handleTrackClick = async (track: LikedTrack) => {
    if (!track.audio_url || track.status !== 'completed') return;

    const variantsData = await getTrackWithVariants(track.id);
    if (variantsData) {
      queryClient.setQueryData(trackVersionsQueryKeys.list(track.id), variantsData);

      const allVersions = [
        { ...variantsData.mainTrack },
        ...variantsData.variants.map(v => ({
          ...v,
          title: variantsData.mainTrack.title,
          styleTags: variantsData.mainTrack.styleTags,
          status: 'completed' as const,
        }))
      ];
      const audioTracks = allVersions.map(v => trackConverters.toAudioPlayer({
        id: v.id,
        title: v.title,
        audio_url: v.audioUrl ?? null,
        cover_url: v.coverUrl ?? null,
        duration: v.duration ?? null,
        duration_seconds: v.duration ?? null,
        style_tags: v.styleTags ?? null,
        lyrics: v.lyrics ?? null,
        status: v.status ?? 'completed',
      })).filter((t): t is NonNullable<typeof t> => t !== null);

      const preferredOrMain = variantsData.preferredVariant || variantsData.mainTrack;
      const startTrack = audioTracks.find(t => t.id === preferredOrMain.id);

      if (startTrack) {
        playTrackWithQueue(startTrack, audioTracks);
      }
    } else {
      playTrackWithQueue({
        id: track.id,
        title: track.title,
        audio_url: track.audio_url!,
        cover_url: track.cover_url || undefined,
        duration: track.duration || undefined,
        style_tags: track.style_tags || undefined,
      }, likedTracks
        .filter(t => t.audio_url && t.status === 'completed')
        .map(t => ({
          id: t.id,
          title: t.title,
          audio_url: t.audio_url!,
          cover_url: t.cover_url || undefined,
          duration: t.duration || undefined,
          style_tags: t.style_tags || undefined,
        }))
      );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (likedTracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4 animate-fade-in">
        <div className="relative mb-6 animate-float">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-full blur-2xl" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 flex items-center justify-center backdrop-blur-xl border border-red-500/20">
            <Heart className="h-10 w-10 text-red-500" />
          </div>
        </div>
        <h2 className="text-3xl font-black mb-3 text-gradient-primary">
          Нет избранных треков
        </h2>
        <p className="text-muted-foreground max-w-md text-lg">
          Треки, которым вы поставите лайк, будут отображаться здесь
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 md:p-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between animate-slide-up">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-pink-500/20 rounded-xl blur-xl animate-pulse-glow" />
            <div className="relative p-3 rounded-xl bg-gradient-to-br from-red-500/20 to-pink-500/20 backdrop-blur-xl border border-red-500/20">
              <Heart className="h-6 w-6 text-red-500 fill-red-500" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gradient-primary flex items-center gap-2">
              Избранное
            </h1>
            <p className="text-muted-foreground mt-1">
              {likedTracks.length} {likedTracks.length === 1 ? 'трек' : likedTracks.length < 5 ? 'трека' : 'треков'} в избранном
            </p>
          </div>
        </div>
      </div>

      {/* Tracks Grid - Responsive: 1 col mobile, 2 tablet, 3 desktop, 4 wide */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {likedTracks.map((track, index) => (
          <div
            key={track.id}
            className="animate-scale-in"
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <TrackCard
              track={{
                id: track.id,
                user_id: track.user_id,
                title: track.title,
                prompt: '',
                improved_prompt: null,
                audio_url: track.audio_url,
                cover_url: track.cover_url,
                video_url: null,
                status: isTrackStatus(track.status) ? track.status : 'completed',
                provider: 'suno',
                created_at: track.created_at,
                updated_at: track.created_at,
                style_tags: track.style_tags,
                lyrics: null,
                duration: track.duration,
                duration_seconds: track.duration,
                error_message: null,
                genre: null,
                mood: null,
                has_vocals: null,
                has_stems: null,
                is_public: null,
                like_count: track.like_count,
                play_count: null,
                download_count: null,
                view_count: track.view_count,
                mureka_task_id: null,
                project_id: null,
                suno_id: null,
                model_name: null,
                created_at_suno: null,
                reference_audio_url: null,
                progress_percent: null,
                idempotency_key: null,
                archived_to_storage: null,
                storage_audio_url: null,
                storage_cover_url: null,
                storage_video_url: null,
                archive_scheduled_at: null,
                archived_at: null,
                metadata: null,
              }}
              onShare={() => handleShare(track.id)}
              onClick={() => handleTrackClick(track)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Favorites;
