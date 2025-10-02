import { useState, useEffect } from "react";
import { Heart, Loader2, Music } from "lucide-react";
import { TrackCard } from "@/components/TrackCard";
import { LikesService } from "@/services/likes.service";
import { supabase } from "@/integrations/supabase/client";
import { useAudioPlayer } from "@/contexts/AudioPlayerContext";
import { getTrackWithVersions } from "@/utils/trackVersions";
import { toast } from "sonner";

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

    if (tracksWithVersions.length > 0) {
      const masterOrMain = tracksWithVersions.find(t => t.isMasterVersion) || tracksWithVersions[0];
      playTrackWithQueue(masterOrMain, tracksWithVersions);
    } else {
      // Fallback to single track
      playTrackWithQueue({
        id: track.id,
        title: track.title,
        audio_url: track.audio_url,
        cover_url: track.cover_url,
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
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center px-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Нет избранных треков</h2>
        <p className="text-muted-foreground max-w-md">
          Треки, которым вы поставите лайк, будут отображаться здесь
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Heart className="h-8 w-8 text-red-500 fill-red-500" />
            Избранное
          </h1>
          <p className="text-muted-foreground mt-1">
            {likedTracks.length} {likedTracks.length === 1 ? 'трек' : likedTracks.length < 5 ? 'трека' : 'треков'}
          </p>
        </div>
      </div>

      {/* Tracks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {likedTracks.map((track) => (
          <TrackCard
            key={track.id}
            track={track as any}
            onDownload={() => handleDownload(track)}
            onShare={() => handleShare(track.id)}
            onClick={() => handleTrackClick(track)}
          />
        ))}
      </div>
    </div>
  );
}
