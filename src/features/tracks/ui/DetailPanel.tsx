import { DetailPanelMobile } from "./DetailPanelMobile";
import { MinimalDetailPanel } from "./MinimalDetailPanel";

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
  variant?: 'desktop' | 'mobile';
}

export const DetailPanel = ({ track, onClose, onUpdate, onDelete, variant = 'desktop' }: DetailPanelProps) => {
  // Mobile compact version
  if (variant === 'mobile') {
    return <DetailPanelMobile track={track} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />;
  }

  // ✅ Always use minimal design for desktop (compact & clean)
  return <MinimalDetailPanel track={track} onClose={onClose} onUpdate={onUpdate} onDelete={onDelete} />;
};
