import { useState, useEffect } from "react";
import { Heart, Loader2 } from "lucide-react";
import { LikesService } from "@/services/likes.service";
import { supabase } from "@/integrations/supabase/client";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { TrackCard, getTrackWithVersions } from "@/features/tracks";
import { primeTrackVersionsCache } from "@/features/tracks/hooks/useTrackVersions";
import { toast } from "sonner";
import { convertToAudioPlayerTrack } from "@/types/track";
import type { TrackStatus } from "@/services/api.service";

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

export default function Favorites() {
  const [likedTracks, setLikedTracks] = useState<LikedTrack[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { playTrackWithQueue } = useAudioPlayer();

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
      console.error('Error loading liked tracks:', error);
      toast.error('Не удалось загрузить избранные треки');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (track: LikedTrack) => {
    if (track.audio_url) {
      window.open(track.audio_url, '_blank');
    }
  };

  const handleShare = (trackId: string) => {
    const shareUrl = `${window.location.origin}/track/${trackId}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success('Ссылка скопирована в буфер обмена');
  };

  const handleTrackClick = async (track: LikedTrack) => {
    if (!track.audio_url || track.status !== 'completed') return;

    // Load track with all versions
    const tracksWithVersions = await getTrackWithVersions(track.id);
    primeTrackVersionsCache(track.id, tracksWithVersions);

    if (tracksWithVersions.length > 0) {
      const toAudioTrack = (version: typeof tracksWithVersions[number]) => {
        const audio = convertToAudioPlayerTrack({
          id: version.id,
          title: version.title,
          audio_url: version.audio_url ?? null,
          cover_url: version.cover_url ?? null,
          duration: version.duration ?? null,
          duration_seconds: version.duration ?? null,
          style_tags: version.style_tags ?? null,
          lyrics: version.lyrics ?? null,
          status: version.status ?? 'completed',
        });

        if (!audio) {
          return null;
        }

        return {
          ...audio,
          parentTrackId: version.parentTrackId ?? track.id,
          versionNumber: version.versionNumber,
          isMasterVersion: version.isMasterVersion,
          isOriginalVersion: version.isOriginal,
          sourceVersionNumber: version.sourceVersionNumber,
        };
      };

      const audioTracks = tracksWithVersions.map(toAudioTrack).filter((t): t is NonNullable<typeof t> => t !== null);
      const masterOrMain = tracksWithVersions.find(t => t.isMasterVersion) || tracksWithVersions.find(t => t.isOriginal) || tracksWithVersions[0];
      const masterAudio = masterOrMain ? toAudioTrack(masterOrMain) : null;

      if (masterAudio && audioTracks.length > 0) {
        playTrackWithQueue(masterAudio, audioTracks);
      }
    } else {
      // Fallback to single track
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

      {/* Tracks Grid */}
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
                title: track.title,
                audio_url: track.audio_url ?? undefined,
                cover_url: track.cover_url ?? undefined,
                status: isTrackStatus(track.status) ? track.status : 'completed',
                created_at: track.created_at,
                style_tags: track.style_tags ?? undefined,
                duration: track.duration ?? undefined,
                like_count: track.like_count ?? undefined,
                view_count: track.view_count ?? undefined,
              }}
              onDownload={() => handleDownload(track)}
              onShare={() => handleShare(track.id)}
              onClick={() => handleTrackClick(track)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
