import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AudioPlayer } from "./AudioPlayer";
import { Loader2, Music } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Track {
  id: string;
  title: string;
  audio_url: string | null;
  status: string;
  created_at: string;
}

interface TracksListProps {
  refreshTrigger?: number;
}

export const TracksList = ({ refreshTrigger }: TracksListProps) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadTracks = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      
      if (!user) return;

      const { data, error } = await supabase
        .from("tracks")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTracks(data || []);
    } catch (error) {
      console.error("Error loading tracks:", error);
      toast({
        title: "Error",
        description: "Failed to load tracks",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTracks();
  }, [refreshTrigger]);

  const handleDelete = async (trackId: string) => {
    try {
      const { error } = await supabase
        .from("tracks")
        .delete()
        .eq("id", trackId);

      if (error) throw error;

      setTracks(tracks.filter((t) => t.id !== trackId));
      toast({
        title: "Track deleted",
        description: "Your track has been removed",
      });
    } catch (error) {
      console.error("Error deleting track:", error);
      toast({
        title: "Error",
        description: "Failed to delete track",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (tracks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Music className="h-16 w-16 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-xl font-semibold mb-2">No tracks yet</h3>
        <p className="text-muted-foreground">
          Generate your first AI music track to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-gradient-secondary">Your Tracks</h2>
      <div className="grid gap-4">
        {tracks.map((track) => (
          <AudioPlayer
            key={track.id}
            trackId={track.id}
            title={track.title}
            audioUrl={track.audio_url || undefined}
            onDelete={() => handleDelete(track.id)}
          />
        ))}
      </div>
    </div>
  );
};
