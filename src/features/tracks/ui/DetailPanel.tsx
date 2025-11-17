import { DetailPanelMobileV2 } from "./DetailPanelMobileV2";
import { ModernDetailPanel } from "./ModernDetailPanel";
import { useBreakpoints } from "@/hooks/useBreakpoints";

interface DetailPanelProps {
  track: {
    id: string;
    user_id: string;
    title: string;
    prompt: string;
    improved_prompt?: string | null;
    status: string;
    audio_url?: string | null;
    cover_url?: string | null;
    video_url?: string | null;
    suno_id?: string | null;
    model_name?: string | null;
    lyrics?: string | null;
    style_tags?: string[] | null;
    genre?: string | null;
    mood?: string | null;
    is_public?: boolean | null;
    view_count?: number | null;
    like_count?: number | null;
    play_count?: number | null;
    download_count?: number | null;
    created_at: string;
    updated_at: string;
    duration_seconds?: number | null;
    has_stems?: boolean | null;
    has_vocals?: boolean | null;
    provider: string | null;
    metadata?: Record<string, any> | null;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  onRemix?: (track: any) => void;
  variant?: 'desktop' | 'mobile';
}

export const DetailPanel = ({ 
  track, 
  open, 
  onOpenChange, 
  onClose, 
  onUpdate, 
  onDelete, 
  onRemix,
  variant 
}: DetailPanelProps) => {
  const { isMobile } = useBreakpoints();
  const effectiveVariant = variant || (isMobile ? 'mobile' : 'desktop');

  // Mobile sheet version
  if (effectiveVariant === 'mobile') {
    return (
      <DetailPanelMobileV2 
        track={track} 
        open={open ?? true}
        onOpenChange={onOpenChange ?? (() => onClose?.())}
        onUpdate={onUpdate} 
        onDelete={onDelete}
        onRemix={onRemix}
      />
    );
  }

  // Desktop panel version
  return (
    <ModernDetailPanel 
      track={track} 
      onClose={onClose} 
      onUpdate={onUpdate} 
      onDelete={onDelete}
      onRemix={onRemix}
    />
  );
};
