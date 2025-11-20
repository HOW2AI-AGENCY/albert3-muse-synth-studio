import { useState, useCallback } from "react";
import { Download, Share2, Trash2, Play, Heart, Info, Music, Settings, X } from "@/utils/iconImports";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { LazyImage } from "@/components/ui/lazy-image";
import { formatDuration } from "@/utils/formatters";
import { TrackService } from '@/services/tracks/track.service';
import { logger } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";
import { useTrackLike } from "@/features/tracks/hooks/useTrackLike";
import { useAudioPlayerStore } from "@/stores/audioPlayerStore";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { MinimalVersionsList } from "./MinimalVersionsList";
import { MinimalStemsList } from "./MinimalStemsList";

interface DetailPanelMobileProps {
  track: {
    id: string;
    title: string;
    prompt: string;
    status: string;
    audio_url?: string;
    cover_url?: string;
    lyrics?: string;
    style_tags?: string[];
    genre?: string;
    mood?: string;
    is_public?: boolean;
    like_count?: number;
    created_at: string;
    duration_seconds?: number;
    has_stems?: boolean;
  };
  onClose?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
}

export const DetailPanelMobile = ({ track, onClose, onUpdate, onDelete }: DetailPanelMobileProps) => {
  const { toast } = useToast();
  const t = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [title, setTitle] = useState(track.title);
  const [genre, setGenre] = useState(track.genre || "");
  const [mood, setMood] = useState(track.mood || "");
  const [isPublic, setIsPublic] = useState(track.is_public || false);
  const [isSaving, setIsSaving] = useState(false);

  const { isLiked, toggleLike } = useTrackLike(track.id, track.like_count || 0);
  const playTrack = useAudioPlayerStore((state) => state.playTrack);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tracks")
        .update({ title, genre: genre || null, mood: mood || null, is_public: isPublic })
        .eq("id", track.id);

      if (error) throw error;
      toast({ title: t('trackDetails.saved') });
      onUpdate?.();
    } catch (error) {
      toast({ title: t('common.error'), description: t('trackDetails.errorSaving'), variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }, [title, genre, mood, isPublic, track.id, toast, onUpdate, t]);

  const handlePlay = useCallback(() => {
    if (!track.audio_url) return;
    playTrack({
      id: track.id,
      title: track.title,
      audio_url: track.audio_url,
      cover_url: track.cover_url,
      duration: track.duration_seconds,
      status: track.status as any,
      style_tags: track.style_tags || [],
      lyrics: track.lyrics,
    });
  }, [track, playTrack]);

  const handleDownload = () => {
    if (track.audio_url) window.open(track.audio_url, "_blank");
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/track/${track.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast({ title: t('trackDetails.linkCopied') });
  };

  const handleDelete = async () => {
    if (!confirm(t('trackDetails.confirmDelete'))) return;

    setIsDeleting(true);
    try {
      await TrackService.deleteTrackCompletely(track.id);
      toast({ title: t('trackDetails.trackDeleted') });
      onDelete?.();
      onClose?.();
    } catch (error) {
      logger.error("Error deleting track", error instanceof Error ? error : new Error(String(error)), "DetailPanelMobile", { trackId: track.id });
      toast({ title: t('common.error'), variant: "destructive" });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScrollArea className="flex-1 bg-gradient-to-b from-background to-background/95">
      {/* Sticky header with close button and safe area */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-background to-background/80 backdrop-blur-sm">
        <div className="flex justify-end p-2 pr-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={t('trackDetails.closePanel')}
            className="rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className="p-3 space-y-3"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)'
        }}
      >
        {/* Compact Hero */}
        <div className="flex gap-3 bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-3 shadow-md">
          <div className="relative shrink-0">
            <LazyImage 
              src={track.cover_url || '/placeholder.svg'}
              alt={track.title}
              className="w-16 h-16 rounded-lg object-cover shadow-lg border-2 border-border/60"
            />
            {track.status === "completed" && (
              <div className="absolute -top-1 -right-1 bg-success rounded-full p-0.5">
                <span className="text-[9px]">✅</span>
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold truncate">{track.title}</h2>
            <div className="flex items-center gap-1.5 flex-wrap mt-1">
              {track.duration_seconds && (
                <span className="text-[10px] text-muted-foreground">
                  ⏱️ {formatDuration(track.duration_seconds)}
                </span>
              )}
              {track.genre && (
                <Badge variant="secondary" className="text-[9px] h-4 px-1">
                  {track.genre}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* P0-M1 fix: Quick Actions with proper touch targets */}
        <div className="grid grid-cols-4 gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={handlePlay}
            disabled={!track.audio_url}
            className="touch-min"
            aria-label={t('trackActions.play')}
          >
            <Play className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={toggleLike}
            className="touch-min"
            aria-label={isLiked ? t('trackActions.unlike') : t('trackActions.like')}
          >
            <Heart className={cn("h-4 w-4 sm:h-3 sm:w-3", isLiked && "fill-current text-red-500")} />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleDownload}
            disabled={!track.audio_url}
            className="touch-min"
            aria-label={t('trackActions.download')}
          >
            <Download className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={handleShare}
            className="touch-min"
            aria-label={t('trackActions.share')}
          >
            <Share2 className="h-4 w-4 sm:h-3 sm:w-3" />
          </Button>
        </div>

        <Separator />

        {/* Accordion Sections */}
        <Accordion type="single" collapsible defaultValue="info" className="space-y-2">
          <AccordionItem value="info" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2.5 hover:no-underline">
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{t('trackDetails.trackInfo')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pb-3">
              <div className="space-y-1.5">
                <Label htmlFor="title-mobile" className="text-[10px]">{t('trackDetails.title')}</Label>
                <Input
                  id="title-mobile"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div className="space-y-1.5">
                  <Label htmlFor="genre-mobile" className="text-[10px]">{t('trackDetails.genre')}</Label>
                  <Input
                    id="genre-mobile"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mood-mobile" className="text-[10px]">{t('trackDetails.mood')}</Label>
                  <Input
                    id="mood-mobile"
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="public-mobile" className="text-[10px]">{t('trackDetails.isPublic')}</Label>
                <Switch id="public-mobile" checked={isPublic} onCheckedChange={setIsPublic} />
              </div>

              {track.prompt && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">{t('generation.prompt')}</Label>
                  <ScrollArea className="max-h-32 sm:max-h-40">
                    <p className="mobile-text-long-form text-contrast-medium bg-muted/30 p-3 rounded-lg">
                      {track.prompt}
                    </p>
                  </ScrollArea>
                </div>
              )}

              <Button onClick={handleSave} disabled={isSaving} size="sm" className="w-full h-7 text-xs">
                {isSaving ? t('trackDetails.saving') : t('common.save')}
              </Button>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="versions" className="border rounded-lg px-3">
            <AccordionTrigger className="py-2.5 hover:no-underline">
              <div className="flex items-center gap-2">
                <Music className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{t('trackDetails.versions')}</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-3">
              <MinimalVersionsList trackId={track.id} />
            </AccordionContent>
          </AccordionItem>

          {track.has_stems && (
            <AccordionItem value="stems" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <div className="flex items-center gap-2">
                  <Settings className="h-3.5 w-3.5" />
                  <span className="text-xs font-medium">{t('trackDetails.stems')}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <MinimalStemsList trackId={track.id} />
              </AccordionContent>
            </AccordionItem>
          )}

          {track.lyrics && (
            <AccordionItem value="lyrics" className="border rounded-lg px-3">
              <AccordionTrigger className="py-2.5 hover:no-underline">
                <span className="text-xs font-medium">📝 {t('generation.lyrics')}</span>
              </AccordionTrigger>
              <AccordionContent className="pb-3">
                <ScrollArea className="max-h-64 sm:max-h-80">
                  <pre className="mobile-text-lyrics text-contrast-medium bg-muted/30 p-3 rounded-lg">
                    {track.lyrics}
                  </pre>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>

        {onDelete && (
          <>
            <Separator />
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full h-8 text-xs"
            >
              <Trash2 className="h-3 w-3 mr-1.5" />
              {isDeleting ? `${t('common.delete')}...` : t('common.delete')}
            </Button>
          </>
        )}
      </div>
    </ScrollArea>
  );
};
