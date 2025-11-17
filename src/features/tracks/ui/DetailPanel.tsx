import { DetailPanelMobile } from "./DetailPanelMobile";
import { ModernDetailPanel } from "./ModernDetailPanel";

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
  onClose?: () => void;
  onUpdate?: () => void;
  onDelete?: () => void;
  variant?: 'desktop' | 'mobile';
}

export const DetailPanel = ({ track, onClose, onUpdate, onDelete, variant = 'desktop' }: DetailPanelProps) => {
  // Mobile compact version
  if (variant === 'mobile') {
    return <DetailPanelMobile track={track as any} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />;
  }

  // ✅ Modern tab-based design for desktop
  return <ModernDetailPanel track={track} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />;
};
