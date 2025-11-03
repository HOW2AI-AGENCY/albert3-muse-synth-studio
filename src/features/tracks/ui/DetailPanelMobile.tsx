import { useState } from "react";
import { Download, Share2, Trash2 } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import { LazyImage } from "@/components/ui/lazy-image";
import { formatDuration, formatDate } from "@/utils/formatters";
import { ApiService } from "@/services/api.service";
import { logger } from "@/utils/logger";

interface DetailItem {
  label: string;
  value: string | number | undefined;
}

const DetailItem = ({ label, value }: DetailItem) => (
  <div className="space-y-0.5">
    <span className="text-xs font-medium text-muted-foreground">{label}</span>
    <p className="text-sm">{value || '—'}</p>
  </div>
);

interface DetailPanelMobileProps {
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

export const DetailPanelMobile = ({ track, onClose, onDelete }: DetailPanelMobileProps) => {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

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
    if (!confirm("Вы уверены, что хотите удалить этот трек? Это действие необратимо.")) {
      return;
    }
    
    setIsDeleting(true);
    try {
      await ApiService.deleteTrackCompletely(track.id);

      toast({
        title: "🗑️ Трек удалён",
        description: "Трек и все связанные данные успешно удалены",
      });

      onDelete?.();
      onClose?.();
    } catch (error) {
      logger.error("Error deleting track", error instanceof Error ? error : new Error(String(error)), "DetailPanelMobile", { trackId: track.id });
      toast({
        title: "Ошибка",
        description: "Не удалось удалить трек",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gradient-to-b from-background to-background/95">
      <div className="p-4 space-y-4">
        {/* Enhanced Compact Header */}
        <div className="flex items-start gap-3 bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-3 shadow-md">
          <div className="relative flex-shrink-0">
            <LazyImage 
              src={track.cover_url || '/placeholder.svg'}
              alt={track.title}
              className="w-20 h-20 rounded-lg object-cover shadow-lg border-2 border-border/60"
            />
            {track.status === "completed" && (
              <div className="absolute -top-1 -right-1 bg-success rounded-full p-1">
                <span className="text-[10px]">✅</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0 space-y-1.5">
            <h2 className="text-lg font-bold truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {track.title}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {track.duration_seconds && (
                <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <span>⏱️</span>
                  {formatDuration(track.duration_seconds)}
                </span>
              )}
              {track.genre && (
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold">
                  {track.genre}
                </Badge>
              )}
            </div>
          </div>
        </div>
        
        {/* Accordion sections */}
        <Accordion type="single" collapsible defaultValue="info" className="w-full">
          <AccordionItem value="info">
            <AccordionTrigger className="text-sm font-medium py-2.5">
              Информация
            </AccordionTrigger>
            <AccordionContent className="space-y-3 pt-2">
              <DetailItem label="Создан" value={formatDate(track.created_at)} />
              {track.model_name && <DetailItem label="Модель" value={track.model_name} />}
              {track.mood && <DetailItem label="Настроение" value={track.mood} />}
              
              {track.prompt && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Промпт</span>
                  <p className="text-sm bg-muted/50 p-2 rounded whitespace-pre-wrap">
                    {track.prompt}
                  </p>
                </div>
              )}
              
              {track.lyrics && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Текст</span>
                  <pre className="text-xs whitespace-pre-wrap bg-muted/50 p-2 rounded max-h-40 overflow-y-auto">
                    {track.lyrics}
                  </pre>
                </div>
              )}
              
              {track.style_tags && track.style_tags.length > 0 && (
                <div className="space-y-1">
                  <span className="text-xs font-medium text-muted-foreground">Теги</span>
                  <div className="flex flex-wrap gap-1">
                    {track.style_tags.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
          
          {track.has_stems && (
            <AccordionItem value="stems">
              <AccordionTrigger className="text-sm font-medium py-2.5">
                Стемы
              </AccordionTrigger>
              <AccordionContent className="pt-2">
                <p className="text-xs text-muted-foreground">
                  Управление стемами доступно на desktop
                </p>
              </AccordionContent>
            </AccordionItem>
          )}
          
          <AccordionItem value="versions">
            <AccordionTrigger className="text-sm font-medium py-2.5">
              Версии
            </AccordionTrigger>
            <AccordionContent className="pt-2">
              <p className="text-xs text-muted-foreground">
                Управление версиями доступно на desktop
              </p>
            </AccordionContent>
          </AccordionItem>
          
          <AccordionItem value="actions">
            <AccordionTrigger className="text-sm font-medium py-2.5">
              Действия
            </AccordionTrigger>
            <AccordionContent className="pt-2 space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start h-10"
                onClick={handleDownload}
                disabled={!track.audio_url}
              >
                <Download className="h-4 w-4 mr-2" />
                Скачать
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start h-10"
                onClick={handleShare}
              >
                <Share2 className="h-4 w-4 mr-2" />
                Поделиться
              </Button>
              {onDelete && (
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="w-full justify-start h-10"
                  onClick={handleDelete}
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? "Удаление..." : "Удалить"}
                </Button>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};
