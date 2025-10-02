import { useState } from "react";
import { X, Download, Share2, Trash2, Eye, Heart, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface DetailPanelProps {
  track: {
    id: string;
    title: string;
    prompt: string;
    status: string;
    audio_url?: string;
    genre?: string;
    mood?: string;
    is_public?: boolean;
    view_count?: number;
    like_count?: number;
    created_at: string;
    duration_seconds?: number;
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
  const { toast } = useToast();

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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="h-full flex flex-col bg-card border-l border-border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold">Детали трека</h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Cover Art Preview */}
        <div className="aspect-square rounded-lg bg-gradient-to-br from-primary/20 via-accent/20 to-primary/10 flex items-center justify-center">
          <div className="text-center space-y-2">
            <div className="text-6xl">🎵</div>
            <Badge variant={track.status === "completed" ? "default" : "secondary"}>
              {track.status}
            </Badge>
          </div>
        </div>

        {/* Metadata Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название трека"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="genre">Жанр</Label>
              <Input
                id="genre"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                placeholder="Electronic"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mood">Настроение</Label>
              <Input
                id="mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="Energetic"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2">
            <div className="space-y-0.5">
              <Label>Публичный трек</Label>
              <p className="text-xs text-muted-foreground">
                Доступен всем пользователям
              </p>
            </div>
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="space-y-2">
          <Button
            variant="default"
            className="w-full"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Сохранение..." : "Сохранить изменения"}
          </Button>

          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!track.audio_url}
            >
              <Download className="h-4 w-4 mr-2" />
              Скачать
            </Button>
            <Button variant="outline" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-2" />
              Поделиться
            </Button>
          </div>
        </div>

        <Separator />

        {/* Stats */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Статистика</h4>
          <div className="grid grid-cols-2 gap-3">
            <Card className="p-3 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Eye className="h-4 w-4" />
                <span className="text-xs">Просмотры</span>
              </div>
              <p className="text-xl font-semibold">{track.view_count || 0}</p>
            </Card>

            <Card className="p-3 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Heart className="h-4 w-4" />
                <span className="text-xs">Лайки</span>
              </div>
              <p className="text-xl font-semibold">{track.like_count || 0}</p>
            </Card>

            <Card className="p-3 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span className="text-xs">Создан</span>
              </div>
              <p className="text-xs font-medium">{formatDate(track.created_at)}</p>
            </Card>

            <Card className="p-3 space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs">Длительность</span>
              </div>
              <p className="text-xs font-medium">
                {formatDuration(track.duration_seconds)}
              </p>
            </Card>
          </div>
        </div>

        <Separator />

        {/* Prompt */}
        <div className="space-y-2">
          <Label>Исходный промпт</Label>
          <div className="p-3 rounded-lg bg-muted text-sm text-muted-foreground">
            {track.prompt}
          </div>
        </div>

        <Separator />

        {/* Danger Zone */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-destructive">Опасная зона</h4>
          <Button variant="destructive" className="w-full" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Удалить трек
          </Button>
        </div>
      </div>
    </div>
  );
};
