import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { DetailPanelContent } from "./DetailPanelContent";

interface DetailPanelProps {
  track: {
    id: string;
    title: string;
    prompt: string;
    status: string;
    audio_url?: string;
    cover_url?: string;
    video_url?: string;
    suno_id?: string;
    model_name?: string;
    lyrics?: string;
    style_tags?: string[];
    genre?: string;
    mood?: string;
    is_public?: boolean;
    view_count?: number;
    like_count?: number;
    created_at: string;
    duration_seconds?: number;
    has_stems?: boolean;
  };
  onClose?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const DetailPanel = ({ track, onClose, onUpdate, onDelete }: DetailPanelProps) => {
  const [title, setTitle] = useState(track.title);
  const [genre, setGenre] = useState(track.genre || "");
  const [mood, setMood] = useState(track.mood || "");
  const [isPublic, setIsPublic] = useState(track.is_public || false);
  const [isSaving, setIsSaving] = useState(false);
  const [versions, setVersions] = useState<any[]>([]);
  const [stems, setStems] = useState<any[]>([]);
  const { toast } = useToast();

  // Load track versions and stems
  useEffect(() => {
    loadVersionsAndStems();
  }, [track.id]);

  const loadVersionsAndStems = async () => {
    // Load versions
    const { data: versionsData } = await supabase
      .from('track_versions')
      .select('*')
      .eq('parent_track_id', track.id)
      .order('version_number');
    
    if (versionsData) {
      setVersions(versionsData);
    }

    // Load stems
    const { data: stemsData } = await supabase
      .from('track_stems')
      .select('*')
      .eq('track_id', track.id);
    
    if (stemsData) {
      setStems(stemsData);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .update({
          title,
          genre: genre || null,
          mood: mood || null,
          is_public: isPublic,
        })
        .eq("id", track.id);

      if (error) throw error;

      toast({
        title: "✅ Сохранено",
        description: "Изменения успешно применены",
      });

      onUpdate?.();
    } catch (error) {
      console.error("Error updating track:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить изменения",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownload = () => {
    if (track.audio_url) {
      window.open(track.audio_url, "_blank");
    }
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/track/${track.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "🔗 Ссылка скопирована",
      description: "Поделитесь ссылкой с друзьями",
    });
  };

  const handleDelete = async () => {
    if (!confirm("Вы уверены, что хотите удалить этот трек?")) return;

    try {
      const { error } = await supabase
        .from("tracks")
        .delete()
        .eq("id", track.id);

      if (error) throw error;

      toast({
        title: "🗑️ Трек удалён",
        description: "Трек успешно удалён из библиотеки",
      });

      onDelete?.();
      onClose?.();
    } catch (error) {
      console.error("Error deleting track:", error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить трек",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Compact Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h3 className="font-semibold text-sm">Детали</h3>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Cover Art Preview - Compact */}
        <div className="aspect-square max-h-64 overflow-hidden border-b border-border">
          {track.cover_url ? (
            <img
              src={track.cover_url}
              alt={track.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
              <div className="text-center space-y-1">
                <div className="text-4xl">🎵</div>
                <Badge variant={track.status === "completed" ? "default" : "secondary"} className="text-xs">
                  {track.status}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DetailPanelContent
          track={track}
          title={title}
          setTitle={setTitle}
          genre={genre}
          setGenre={setGenre}
          mood={mood}
          setMood={setMood}
          isPublic={isPublic}
          setIsPublic={setIsPublic}
          isSaving={isSaving}
          versions={versions}
          stems={stems}
          onSave={handleSave}
          onDownload={handleDownload}
          onShare={handleShare}
          onDelete={handleDelete}
          loadVersionsAndStems={loadVersionsAndStems}
        />
      </div>
    </div>
  );
};
